#!/usr/bin/env node

/**
 * Inspect migration workbook and show sheet names, row counts, and sample normalized rows
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const migrationDir = path.join(__dirname, '..', 'migration-data');
const excelFile = path.join(migrationDir, 'migration.xlsx');

if (!fs.existsSync(excelFile)) {
  console.error('No migration.xlsx found in migration-data/');
  process.exit(1);
}

const workbook = XLSX.readFile(excelFile);
console.log('Workbook sheets:', workbook.SheetNames.join(', '));

function normalizeRow(row) {
  return {
    id: row.ID || row.id || row.Id || null,
    email: row.Email || row.email || null,
    phone: row.Phone || row.phone || null,
    job_title: row.Job_Title || row['Job Title'] || row.job_title || row['Job title'] || null,
    cv_file_url: row['CV File'] || row['CV File URL'] || row.cv_file_url || row.file || null,
    source: row.Source || row.source || 'manual',
    status: row.Status || row.status || 'pending'
  };
}

for (const name of workbook.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: null });
  console.log(`\nSheet: ${name}  rows: ${rows.length}`);
  if (/application/i.test(name) || /applicant/i.test(name) || name.toLowerCase()==='applications') {
    const normalized = rows.map(normalizeRow);
    const valid = normalized.filter(r => r.job_title || r.email);
    console.log('  Sample normalized rows (first 10):', JSON.stringify(normalized.slice(0,10), null, 2));
    console.log('  Count passing basic validation (job_title or email):', valid.length);
    if (valid.length>0) console.log('  Sample valid row:', JSON.stringify(valid[0], null, 2));
  } else {
    // show header keys of first row
    if (rows.length>0) {
      console.log('  Example row keys:', Object.keys(rows[0]).slice(0,20).join(', '));
      console.log('  Example first row:', JSON.stringify(rows[0], null, 2));
    }
  }
}
