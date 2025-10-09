#!/usr/bin/env node

/**
 * upload-cvs.js
 *
 * Upload CV files found in `migration-cvs/` to Vercel Blob using @vercel/blob and
 * update the corresponding `application.cv_file_url` field in the database.
 *
 * Matching heuristics (attempted in order):
 *  1. filename starts with application id (UUID). Example: "<uuid>.pdf"
 *  2. filename contains the email (sanitized) of applicant
 *  3. filename equals application id without extension
 *  4. fallback: user can provide a mapping file `migration-data/file_map.json`
 *
 * Usage:
 * 1. Place CV files in ./migration-cvs/
 * 2. Optionally create migration-data/file_map.json in the shape { "filename.pdf": "application-id-or-email" }
 * 3. Run: node scripts/upload-cvs.js
 */

const fs = require('fs');
const path = require('path');
const { put } = require('@vercel/blob');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const cvsDir = path.join(__dirname, '..', 'migration-cvs');
const migrationDataDir = path.join(__dirname, '..', 'migration-data');
const fileMapPath = path.join(migrationDataDir, 'file_map.json');

if (!fs.existsSync(cvsDir)) fs.mkdirSync(cvsDir);
if (!fs.existsSync(migrationDataDir)) fs.mkdirSync(migrationDataDir);

let fileMap = {};
if (fs.existsSync(fileMapPath)) {
  try { fileMap = JSON.parse(fs.readFileSync(fileMapPath, 'utf8')); } catch (e) { console.error('Invalid file_map.json, ignoring.'); }
}

function sanitizedEmail(email) {
  if (!email) return '';
  return email.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

async function findApplicationForFile(filename) {
  const name = path.parse(filename).name;

  // 1. exact UUID match
  if (/^[0-9a-fA-F-]{36}$/.test(name)) {
    const app = await prisma.application.findUnique({ where: { id: name } });
    if (app) return app;
  }

  // 2. map file
  if (fileMap[filename]) {
    const key = fileMap[filename];
    // try id
    const byId = await prisma.application.findUnique({ where: { id: key } }).catch(() => null);
    if (byId) return byId;
    // try by email
    const byEmail = await prisma.application.findFirst({ where: { email: key } }).catch(() => null);
    if (byEmail) return byEmail;
  }

  // 3. match by sanitized email contained in filename
  const apps = await prisma.application.findMany({ where: { email: { not: null } } });
  const sanitized = sanitizedEmail(name);
  for (const a of apps) {
    if (!a.email) continue;
    if (sanitized && sanitizedEmail(a.email) && sanitized.includes(sanitizedEmail(a.email))) return a;
  }

  // 4. try to match by job_title or other heuristics - limited to small set
  const candidates = await prisma.application.findMany({ take: 50 });
  for (const c of candidates) {
    if (!c.id) continue;
    if (sanitized === c.id.replace(/-/g, '')) return c;
  }

  return null;
}

async function uploadFile(filePath, filename) {
  const buffer = fs.readFileSync(filePath);
  let contentType = 'application/pdf';
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.doc') contentType = 'application/msword';
  if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const uploaded = await put(filename, buffer, { access: 'public', contentType });
  return uploaded.url;
}

function blobUrlFor(filename) {
  return `https://blob.vercel-storage.com/${filename}`;
}

async function checkBlobExists(filename) {
  const url = blobUrlFor(filename);
  try {
    // Try HEAD first
    const res = await fetch(url, { method: 'HEAD' });
    if (res.status === 200) return true;
    if (res.status === 404) return false;
    // fallback to GET
    const res2 = await fetch(url, { method: 'GET' });
    return res2.status === 200;
  } catch (e) {
    console.warn('  Blob existence check failed for', filename, e.message || e);
    return false;
  }
}

async function main() {
  const files = fs.readdirSync(cvsDir).filter((f) => fs.lstatSync(path.join(cvsDir, f)).isFile());
  console.log(`Found ${files.length} files in migration-cvs/`);

  let success = 0;
  let skipped = 0;
  const skippedFiles = [];
  const uploadedFiles = [];

  // CLI options
  const args = process.argv.slice(2);
  const force = args.includes('--force');

  for (const file of files) {
    const fp = path.join(cvsDir, file);
    console.log('\nProcessing', file);

    try {
      const targetFileName = file;

      // Check blob storage for the file first
      const exists = await checkBlobExists(targetFileName);
      if (exists && !force) {
        console.log('  Skipping upload - file already exists in blob:', blobUrlFor(targetFileName));
        skipped++;
        skippedFiles.push(targetFileName);
        continue;
      }

      // Upload
      let url;
      try {
        url = await uploadFile(fp, targetFileName);
        console.log('  Uploaded to blob:', url);
        uploadedFiles.push({ filename: targetFileName, url });
        success++;
      } catch (uploadErr) {
        console.error('  Upload failed for', file, uploadErr.message || uploadErr);
        continue;
      }

    } catch (e) {
      console.error('  Failed to process', file, e.message || e);
    }
  }

  // Write unmatched file list
  try {
    const report = {
      uploaded: uploadedFiles,
      skipped: skippedFiles,
      timestamp: new Date().toISOString()
    };
    const outPath = path.join(migrationDataDir, 'upload-report.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
    console.log('Wrote upload report to', outPath);
  } catch (e) {
    console.warn('Could not write unmatched files file:', e.message || e);
  }

  console.log(`\nDone. uploaded=${success}, skipped=${skipped}`);
}

main()
  .catch((e) => {
    console.error('Upload script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
