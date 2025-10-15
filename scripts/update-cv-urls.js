#!/usr/bin/env node

/**
 * scripts/update-cv-urls.js
 *
 * Updates `applications.cv_file_url` rows that currently point to Google Drive
 * links. For each such application, it will set `cv_file_url` to:
 *
 *   <CV_File_Url from .env> + <application id>.pdf
 *
 * This script is safe to run with DRY_RUN=1 which will only log the actions
 * without performing any updates.
 *
 * Usage:
 *   node scripts/update-cv-urls.js         # runs and performs updates
 *   DRY_RUN=1 node scripts/update-cv-urls.js  # only shows what would change
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const process = require('process');

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

function isGoogleDriveUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const u = url.trim();
  // Common google drive markers
  return (
    u.includes('drive.google.com') ||
    u.includes('docs.google.com') ||
    u.includes('drive.googleusercontent.com') ||
    /https:\/\/drive\.google\.com\/.+/i.test(u)
  );
}

async function main() {
  const envCvBase = process.env.CV_File_Url || process.env.CV_FILE_URL || process.env.CV_File_Url;
  if (!envCvBase) {
    console.error('Error: CV_File_Url is not defined in environment. Set CV_File_Url in .env or environment.');
    process.exit(2);
  }

  // Normalize base: ensure it ends with '/'
  const base = envCvBase.endsWith('/') ? envCvBase : envCvBase + '/';

  console.log('Starting update-cv-urls.js', DRY_RUN ? '(DRY RUN)' : '');

  try {
    // Find applications that have cv_file_url set and look like Google Drive links
    const candidates = await prisma.application.findMany({
      where: {
        cv_file_url: {
          not: null
        }
      },
      select: { id: true, cv_file_url: true }
    });

    const toUpdate = candidates.filter(c => isGoogleDriveUrl(c.cv_file_url));

    console.log(`Found ${candidates.length} applications with cv_file_url; ${toUpdate.length} appear to be Google Drive URLs and will be updated.`);

    let updated = 0;
    for (const row of toUpdate) {
      const newUrl = base + row.id + '.pdf';
      if (DRY_RUN) {
        console.log(`[DRY] Would update ${row.id}: '${row.cv_file_url}' -> '${newUrl}'`);
        updated++;
        continue;
      }

      try {
        await prisma.application.update({ where: { id: row.id }, data: { cv_file_url: newUrl } });
        console.log(`Updated ${row.id} -> ${newUrl}`);
        updated++;
      } catch (e) {
        console.error('Failed to update', row.id, e.message || e);
      }
    }

    console.log(`Done. ${updated} records processed (${DRY_RUN ? 'no changes made (dry run)' : 'updated'}).`);
  } catch (e) {
    console.error('Unexpected error:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
