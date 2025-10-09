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

  // Helper: migrate vacancies
  async function migrateVacancies(rows) {
    let created = 0;
    for (const row of rows) {
      const title = row.Job_Title || row.job_title || row['Job Title'] || row.job_title_text || null;
      if (!title) continue;
      try {
        const existing = await prisma.vacancy.findFirst({ where: { job_title: title } });
        if (existing) continue;
        await prisma.vacancy.create({ data: {
          job_title: title,
          url: row.URL || row.url || null,
          description: row.Description || row.description || null,
          status: row.Status || 'active'
        }});
        created++;
      } catch (e) {
        console.error('Vacancy row error:', e, row);
      }
    }
    return { created };
  }

  // Helper: migrate applications
  async function migrateApplications(rows) {
    let created = 0, skipped = 0;
    for (const raw of rows) {
      const r = normalizeRow(raw);
      if (!r.job_title && !r.email) continue;
      try {
        // If ID provided and exists, skip (insert-only semantics)
        if (r.id) {
          const existing = await prisma.application.findUnique({ where: { id: r.id } });
          if (existing) {
            skipped++;
            continue;
          }
        }

        // If no ID, try to avoid duplicates by email + job_title
        if (!r.id && r.email && r.job_title) {
          const dup = await prisma.application.findFirst({ where: { email: r.email, job_title: r.job_title } });
          if (dup) {
            skipped++;
            continue;
          }
        }

        // Create new application. If no id provided, let DB generate UUID.
        await prisma.application.create({ data: {
          id: r.id || undefined,
          email: r.email,
          phone: normalizePhone(r.phone),
          job_title: r.job_title || 'Unknown',
          cv_file_url: r.cv_file_url,
          source: r.source || 'manual',
          status: r.status || 'pending'
        }});
        created++;
      } catch (e) {
        console.error('Application row error:', e, raw);
      }
    }
    return { created, skipped };
  }

  // Helper: migrate rankings
  async function migrateRankings(rows) {
    let created = 0, skipped = 0;
    for (const row of rows) {
      const application_id = row.Application_ID || row.application_id || row.ID || row.Id || null;
      if (!application_id) continue;
      try {
        const existingApp = await prisma.application.findUnique({ where: { id: application_id } });
        if (!existingApp) {
          skipped++;
          continue;
        }
        // Skip if a ranking for this application already exists
        const existingRanking = await prisma.cvRanking.findFirst({ where: { application_id } });
        if (existingRanking) {
          skipped++;
          continue;
        }
        // Build ranking object
        const ranking = {
          application_id: application_id,
          education_score: parseIntSafe(row.Education_Score || row.education_score),
          education_evidence: row.Education_Evidence || row.education_evidence || null,
          work_experience_score: parseIntSafe(row.Work_Experience_Score || row.work_experience_score),
          work_experience_evidence: row.Work_Experience_Evidence || row.work_experience_evidence || null,
          skill_match_score: parseIntSafe(row.Skill_Match_Score || row.skill_match_score),
          skill_match_evidence: row.Skill_Match_Evidence || row.skill_match_evidence || null,
          certifications_score: parseIntSafe(row.Certifications_Score || row.certifications_score),
          certifications_evidence: row.Certifications_Evidence || row.certifications_evidence || null,
          domain_knowledge_score: parseIntSafe(row.Domain_Knowledge_Score || row.domain_knowledge_score),
          domain_knowledge_evidence: row.Domain_Knowledge_Evidence || row.domain_knowledge_evidence || null,
          soft_skills_score: parseIntSafe(row.Soft_Skills_Score || row.soft_skills_score),
          soft_skills_evidence: row.Soft_Skills_Evidence || row.soft_skills_evidence || null,
          total_score: parseIntSafe(row.Total_Score || row.total_score),
          final_score: parseFloatSafe(row.Final_Score || row.final_score),
          summary: row.Summary || row.summary || null
        };
        await prisma.cvRanking.create({ data: ranking });
        created++;
      } catch (e) {
        console.error('Ranking row error:', e, row);
      }
    }
    return { created, skipped };
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
