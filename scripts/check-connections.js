#!/usr/bin/env node

/**
 * scripts/check-connections.js
 *
 * Verifies:
 * - DATABASE_URL presence and simple DB query via Prisma
 * - BLOB_READ_WRITE_TOKEN presence and a transient upload+delete via @vercel/blob (if token present)
 *
 * Prints only statuses (does not print secrets).
 */

const util = require('util');

async function checkDatabase() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    console.log('Checking database connection...');
    // simple raw query
    await prisma.$connect();
    const res = await prisma.$queryRaw`SELECT 1 as ok`;
    // Some Prisma builds return objects or arrays; accept any truthy result
    console.log('  Database query result:', Array.isArray(res) ? res[0] || res : res);
    await prisma.$disconnect();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

async function checkBlob() {
  // Only run blob check if token present
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_BLOB_TOKEN) {
    return { ok: false, reason: 'No blob token environment variable (BLOB_READ_WRITE_TOKEN or VERCEL_BLOB_TOKEN) found' };
  }

  try {
    const { put, del } = require('@vercel/blob');
  console.log('Checking Vercel Blob (transient upload)...');
  const filename = `migration-connection-test-${Date.now()}.txt`;
  const buffer = Buffer.from('ok');
  // Allow overriding test access level with BLOB_TEST_ACCESS env var (e.g. 'public')
  const accessLevel = process.env.BLOB_TEST_ACCESS || 'private';
  const blob = await put(filename, buffer, { access: accessLevel, contentType: 'text/plain' });
    if (!blob || !blob.url) {
      return { ok: false, error: 'Upload returned no URL' };
    }
    console.log('  Uploaded (temporary) to blob');
    // Attempt to delete
    try {
      await del(blob.url);
      console.log('  Deleted test blob successfully');
    } catch (delErr) {
      console.warn('  Warning: could not delete test blob:', delErr.message || delErr);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

(async function main() {
  console.log('\nConnection checks - results will not include secrets\n');

  // Database check
  const dbRes = await checkDatabase();
  if (dbRes.ok) {
    console.log('\u2705 Database: connection and simple query OK');
  } else {
    console.error('\u274c Database: failed -', dbRes.error || dbRes.reason);
  }

  // Blob check
  const blobRes = await checkBlob();
  if (blobRes.ok) {
    console.log('\u2705 Blob: upload+delete OK');
  } else {
    console.error('\u274c Blob: check failed -', blobRes.error || blobRes.reason);
  }

  // Exit with non-zero if either failed
  if (!dbRes.ok || !blobRes.ok) process.exitCode = 1;
})();
