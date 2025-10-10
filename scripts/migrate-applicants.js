#!/usr/bin/env node

/**
 * migrate-applicants.js
 *
 * Reads an Excel (.xlsx) or CSV file exported from the legacy system and
 * migrates applicant rows into the Neon/Postgres database using Prisma.
 *
 * Usage:
 * 1. Place your file as `migration-data/applicants.xlsx` or `migration-data/applicants.csv`
 * 2. Run: node scripts/migrate-applicants.js
 *
 * Behavior:
 * - If the row contains an `ID`/`id` value that matches an existing application id, it will update the row.
 * - Otherwise it will create a new `application` row. CV file paths/filenames are stored in `cv_file_url` temporarily
 *   and should be processed by `scripts/upload-cvs.js` to actually upload files to Vercel Blob.
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();

const migrationDir = path.join(__dirname, '..', 'migration-data');
if (!fs.existsSync(migrationDir)) fs.mkdirSync(migrationDir);

const excelFile = path.join(migrationDir, 'migration.xlsx');
const csvFile = path.join(migrationDir, 'migration.csv');

/**
 * Read an Excel workbook with multiple sheets or a single CSV and return a map
 * of sheetName -> rows[]
 */
async function readSheets() {
  if (fs.existsSync(excelFile)) {
    console.log('Reading Excel workbook:', excelFile);
    const workbook = XLSX.readFile(excelFile);
    const sheets = {};
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      sheets[name] = XLSX.utils.sheet_to_json(sheet, { defval: null });
    }
    return sheets;
  }

  if (fs.existsSync(csvFile)) {
    console.log('Reading CSV file as single sheet:', csvFile);
    const workbook = XLSX.readFile(csvFile, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return { [sheetName]: XLSX.utils.sheet_to_json(sheet, { defval: null }) };
  }

  console.log('No migration.xlsx or migration.csv found in migration-data/. Create one and re-run.');
  process.exit(0);
}

function normalizeRow(row) {
  // Accept multiple header variants for common application fields
  return {
    id: row.ID || row.id || row.Id || null,
    email: row.Email || row.email || null,
    phone: row.Phone || row.phone || null,
    job_title: row.Job_Title || row['Job Title'] || row.job_title || null,
    cv_file_url: row['CV File'] || row['CV File URL'] || row.cv_file_url || row.file || null,
    source: row.Source || row.source || 'manual',
    status: row.Status || row.status || 'pending'
  };
}

function parseIntSafe(v) {
  const n = parseInt(v);
  return Number.isFinite(n) ? n : 0;
}

function parseFloatSafe(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// Parse and return null when source is empty/undefined/null; return numeric value (including 0) when present
function parseIntMaybe(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = parseInt(v);
  return Number.isFinite(n) ? n : null;
}

function parseFloatMaybe(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

// Get a cell from a row by trying several header variants
function getCell(row, name) {
  if (!row || !name) return null;
  const variants = [];
  // common forms
  variants.push(name);
  variants.push(name.replace(/ /g, '_'));
  variants.push(name.replace(/ /g, '').toLowerCase());
  variants.push(name.toLowerCase());
  variants.push(name.replace(/ /g, '').replace(/_/g, '').toLowerCase());
  // also push exact lower/upper
  variants.push(name.toUpperCase());
  variants.push(name.charAt(0).toUpperCase() + name.slice(1));

  for (const v of variants) {
    if (Object.prototype.hasOwnProperty.call(row, v)) return row[v];
  }
  return null;
}

function normalizePhone(raw) {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  if (!s) return null;
  // Excel sometimes shows numbers without leading + and as floats; drop trailing .0
  if (/^[-+]?\d+\.0$/.test(s)) {
    s = s.replace(/\.0$/, '');
  }
  // Common error markers
  if (s === '#ERROR!' || s.toLowerCase() === 'nan' || s.toLowerCase() === 'null') return null;
  // Keep leading + if present, then strip all non-digits
  const plus = s.startsWith('+') ? '+' : '';
  const digits = s.replace(/[^0-9]/g, '');
  if (!digits) return null;
  return plus + digits;
}

async function migrate() {
  const sheets = await readSheets();
  const summary = {};
  const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
  const RANKINGS_ONLY = process.env.RANKINGS_ONLY === '1' || process.env.RANKINGS_ONLY === 'true';
  // When true, allow an explicit 0 from the source to overwrite a 0 in DB as well.
  const ALLOW_ZERO_OVERWRITE = process.env.ALLOW_ZERO_OVERWRITE === '1' || process.env.ALLOW_ZERO_OVERWRITE === 'true';

  // Build a mapping of job_title -> url from any JD/vacancy-like sheets so we can use
  // the canonical URL when filling vacancies or linking applications.
  const jdUrlMap = {};
  for (const [sheetName, rows] of Object.entries(sheets)) {
    const key = sheetName.toLowerCase();
    if (key.includes('vacancy') || key.includes('vacancies') || key.includes('jobs') || key.includes('jd')) {
      for (const row of rows) {
        const title = row.Job_Title || row.job_title || row['Job Title'] || row.job_title_text || null;
        const url = row.URL || row.url || null;
        if (title && url) jdUrlMap[title] = url;
      }
    }
  }

  // Helper: migrate vacancies
  async function migrateVacancies(rows) {
    let created = 0, updated = 0;
    for (const row of rows) {
      const title = row.Job_Title || row.job_title || row['Job Title'] || row.job_title_text || null;
      if (!title) continue;
      try {
        const url = row.URL || row.url || null;
        const description = row.Description || row.description || null;
        const status = row.Status || 'active';

        const existing = await prisma.vacancy.findFirst({ where: { job_title: title } });
        if (existing) {
          const update = {};
          // Only update when DB value is empty/null
          // Prefer the JD sheet mapping if available
          const mappedUrl = jdUrlMap[title];
          if ((!existing.url || existing.url === '') && (url || mappedUrl)) update.url = url || mappedUrl;
          if ((!existing.description || existing.description === '') && description) update.description = description;
          if ((!existing.status || existing.status === '') && status) update.status = status;
          if (Object.keys(update).length > 0) {
            if (DRY_RUN) console.log('DRY RUN: would update vacancy', existing.id, update);
            else await prisma.vacancy.update({ where: { id: existing.id }, data: update });
            updated++;
          }
          continue;
        }

        const createData = { job_title: title, url: url || jdUrlMap[title] || null, description, status };
        if (DRY_RUN) console.log('DRY RUN: would create vacancy', createData);
        else await prisma.vacancy.create({ data: createData });
        created++;
      } catch (e) {
        console.error('Vacancy row error:', e, row);
      }
    }
    return { created, updated };
  }

  // Helper: migrate applications
  async function migrateApplications(rows) {
    let created = 0, updated = 0, skipped = 0;
    for (const raw of rows) {
      const r = normalizeRow(raw);
      if (!r.job_title && !r.email) continue;
      try {
        // Find existing by id if provided
        let existing = null;
        if (r.id) existing = await prisma.application.findUnique({ where: { id: r.id } });

        // If no id, try to find by email+job_title
        if (!existing && r.email && r.job_title) {
          existing = await prisma.application.findFirst({ where: { email: r.email, job_title: r.job_title } });
        }

        // Find vacancy for this job_title if present
        let vacancy = null;
        if (r.job_title) {
          vacancy = await prisma.vacancy.findFirst({ where: { job_title: r.job_title } });
        }

        if (existing) {
          // Build update object only for missing/empty fields
          const update = {};
          if ((!existing.email || existing.email === '') && r.email) update.email = r.email;
          const normPhone = normalizePhone(r.phone);
          if ((!existing.phone || existing.phone === '') && normPhone) update.phone = normPhone;
          if ((!existing.job_title || existing.job_title === '') && r.job_title) update.job_title = r.job_title;
          if ((!existing.cv_file_url || existing.cv_file_url === '') && r.cv_file_url) update.cv_file_url = r.cv_file_url;
          if ((!existing.source || existing.source === '') && r.source) update.source = r.source;
          if ((!existing.status || existing.status === '') && r.status) update.status = r.status;
          if ((!existing.vacancy_id || existing.vacancy_id === null) && vacancy) update.vacancy_id = vacancy.id;

          // If vacancy exists but missing URL, fill it from JD mapping when available
          if (vacancy && (!vacancy.url || vacancy.url === '') && jdUrlMap[r.job_title]) {
            if (!update.vacancy_id) update.vacancy_id = vacancy.id;
            if (DRY_RUN) console.log('DRY RUN: would update vacancy URL for', vacancy.id, jdUrlMap[r.job_title]);
            else {
              try { await prisma.vacancy.update({ where: { id: vacancy.id }, data: { url: jdUrlMap[r.job_title] } }); }
              catch (e) { console.error('Failed to update vacancy URL:', e); }
            }
          }

          if (Object.keys(update).length > 0) {
            if (DRY_RUN) console.log('DRY RUN: would update application', existing.id, update);
            else await prisma.application.update({ where: { id: existing.id }, data: update });
            updated++;
          } else {
            skipped++;
          }
          continue;
        }

        // Create new application. If no id provided, let DB generate UUID.
        const appData = {
          id: r.id || undefined,
          email: r.email,
          phone: normalizePhone(r.phone),
          job_title: r.job_title || 'Unknown',
          vacancy_id: vacancy ? vacancy.id : undefined,
          cv_file_url: r.cv_file_url,
          source: r.source || 'manual',
          status: r.status || 'pending'
        };
        if (DRY_RUN) console.log('DRY RUN: would create application', appData);
        else await prisma.application.create({ data: appData });
        created++;
      } catch (e) {
        console.error('Application row error:', e, raw);
      }
    }
    return { created, updated, skipped };
  }

  // Helper: migrate rankings
  async function migrateRankings(rows) {
    let created = 0, updated = 0, skipped = 0;
    const DEBUG_LIMIT = parseInt(process.env.DEBUG_LIMIT || '5');
    let debugCount = 0;
    for (const row of rows) {
      const application_id = row.Application_ID || row.application_id || row.ID || row.Id || null;
      if (!application_id) continue;
      try {
        const existingApp = await prisma.application.findUnique({ where: { id: application_id } });
        if (!existingApp) {
          skipped++;
          continue;
        }

        const existingRanking = await prisma.cvRanking.findFirst({ where: { application_id } });

        const parsed = {
          education_score: parseIntMaybe(getCell(row, 'Education Score')),
          education_evidence: getCell(row, 'Education Evidence') || getCell(row, 'Education_Evidence') || null,
          work_experience_score: parseIntMaybe(getCell(row, 'Work Experience Score')),
          work_experience_evidence: getCell(row, 'Work Experience Evidence') || null,
          skill_match_score: parseIntMaybe(getCell(row, 'Skill Set Match Score') || getCell(row, 'Skill Match Score') || getCell(row, 'Skill Set Score')),
          skill_match_evidence: getCell(row, 'Skill Set Match Evidence') || null,
          certifications_score: parseIntMaybe(getCell(row, 'Certifications Score')),
          certifications_evidence: getCell(row, 'Certifications Evidence') || null,
          domain_knowledge_score: parseIntMaybe(getCell(row, 'Domain Knowledge Score')),
          domain_knowledge_evidence: getCell(row, 'Domain Knowledge Evidence') || null,
          soft_skills_score: parseIntMaybe(getCell(row, 'Soft Skills Score')),
          soft_skills_evidence: getCell(row, 'Soft Skills Evidence') || null,
          total_score: parseIntMaybe(getCell(row, 'Total Score')),
          final_score: parseFloatMaybe(getCell(row, 'Final Score')),
          summary: getCell(row, 'Summary') || null
        };

        if (existingRanking) {
          if (DRY_RUN && debugCount < DEBUG_LIMIT) {
            console.log('DRY RUN DIAG: application_id=', application_id);
            console.log('  raw row keys:', Object.keys(row).slice(0,50));
            console.log('  parsed sample:', {
              education_score: parsed.education_score,
              work_experience_score: parsed.work_experience_score,
              skill_match_score: parsed.skill_match_score,
              total_score: parsed.total_score,
              final_score: parsed.final_score
            });
            console.log('  existingRanking sample:', {
              education_score: existingRanking.education_score,
              work_experience_score: existingRanking.work_experience_score,
              skill_match_score: existingRanking.skill_match_score,
              total_score: existingRanking.total_score,
              final_score: existingRanking.final_score
            });
            debugCount++;
          }
          const update = {};
          // For numeric scores, update if DB has 0 and source has > 0
          const scoreKeys = [
            'education_score','work_experience_score','skill_match_score','certifications_score','domain_knowledge_score','soft_skills_score','total_score'
          ];
          for (const k of scoreKeys) {
            // Update when DB is null or 0 AND source has a defined numeric value (including 0)
            if ((existingRanking[k] === null || existingRanking[k] === 0) && parsed[k] !== null) {
              // If source numeric is 0 and DB is 0, only overwrite when ALLOW_ZERO_OVERWRITE=true or DB is null
              if (parsed[k] === 0 && existingRanking[k] === 0 && !ALLOW_ZERO_OVERWRITE && existingRanking[k] !== null) {
                // don't overwrite a 0 with 0 unless allowed
              } else {
                update[k] = parsed[k];
              }
            }
          }
          if ((existingRanking.final_score === null || Number(existingRanking.final_score) === 0) && parsed.final_score !== null) {
            if (!(Number(parsed.final_score) === 0 && Number(existingRanking.final_score) === 0 && !ALLOW_ZERO_OVERWRITE && existingRanking.final_score !== null)) {
              update.final_score = parsed.final_score;
            }
          }
          // For evidence and summary strings, update when empty/null
          const textKeys = ['education_evidence','work_experience_evidence','skill_match_evidence','certifications_evidence','domain_knowledge_evidence','soft_skills_evidence','summary'];
          for (const k of textKeys) {
            if ((!existingRanking[k] || existingRanking[k] === '') && parsed[k]) update[k] = parsed[k];
          }

          if (Object.keys(update).length > 0) {
            if (DRY_RUN) console.log('DRY RUN: would update ranking', existingRanking.id, update);
            else await prisma.cvRanking.update({ where: { id: existingRanking.id }, data: update });
            updated++;
          } else {
            skipped++;
          }
          continue;
        }

        const ranking = Object.assign({ application_id }, parsed);
        if (DRY_RUN) console.log('DRY RUN: would create ranking', ranking);
        else await prisma.cvRanking.create({ data: ranking });
        created++;
      } catch (e) {
        console.error('Ranking row error:', e, row);
      }
    }
    return { created, updated, skipped };
  }

  // Helper: migrate referrals
  async function migrateReferrals(rows) {
    let created = 0, skipped = 0;
    for (const row of rows) {
      try {
        const data = {
          email: row.Email || row.email || null,
          phone: normalizePhone(row.Phone || row.phone || null),
          job_title: row.Job_Title || row['Job Title'] || row.job_title || null,
          cv_file_url: row['CV File'] || row['CV File URL'] || row.file || null,
          copied: (row.Copied || row.copied) === 'Y' || false
        };
        if (!data.email || !data.job_title) continue;
        // Skip if a referral with same email and job_title already exists
        const dup = await prisma.referral.findFirst({ where: { email: data.email, job_title: data.job_title } });
        if (dup) {
          skipped++;
          continue;
        }
        await prisma.referral.create({ data });
        created++;
      } catch (e) {
        console.error('Referral row error:', e, row);
      }
    }
    return { created, skipped };
  }

  // Iterate through sheets and call appropriate handlers based on sheet name
  for (const [sheetName, rows] of Object.entries(sheets)) {
    console.log(`\nProcessing sheet: ${sheetName} (${rows.length} rows)`);
    const key = sheetName.toLowerCase();
    if (RANKINGS_ONLY) {
      // If user only wants rankings, skip other sheets
      if (key.includes('rank') || key.includes('ranking') || key.includes('cv_rankings') || key.includes('ranks')) {
        summary[sheetName] = await migrateRankings(rows);
      } else {
        console.log('  Skipping non-ranking sheet due to RANKINGS_ONLY');
        summary[sheetName] = { created: 0, updated: 0, skipped: 0 };
      }
    } else {
      if (key.includes('vacancy') || key.includes('vacancies') || key.includes('jobs') || key.includes('jd')) {
        summary[sheetName] = await migrateVacancies(rows);
      } else if (key.includes('application') || key.includes('applications') || key.includes('applicants')) {
        summary[sheetName] = await migrateApplications(rows);
      } else if (key.includes('rank') || key.includes('ranking') || key.includes('cv_rankings') || key.includes('ranks')) {
        summary[sheetName] = await migrateRankings(rows);
      } else if (key.includes('referral') || key.includes('referrals')) {
        summary[sheetName] = await migrateReferrals(rows);
      } else {
        console.log('  Unknown sheet name — attempting to treat as applications by default');
        summary[sheetName] = await migrateApplications(rows);
      }
    }
  }

  console.log('\nMigration summary:');
  console.log(JSON.stringify(summary, null, 2));
}

migrate()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
