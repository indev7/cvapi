#!/usr/bin/env node
/**
 * Backfill vacancy_id for applications missing it by matching job_title -> vacancy.id
 * Strategy: find vacancy with same job_title, prefer most recently created vacancy.
 * Usage: node scripts/backfillVacancyIds.js [--dry-run]
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')

async function main() {
  console.log('Finding applications missing vacancy_id...')

  const apps = await prisma.application.findMany({ where: { vacancy_id: null }, select: { id: true, job_title: true } })
  console.log(`Found ${apps.length} applications without vacancy_id`)

  let updated = 0
  for (const a of apps) {
    if (!a.job_title) continue

    const vacancy = await prisma.vacancy.findFirst({ where: { job_title: a.job_title }, orderBy: { created_at: 'desc' } })
    if (!vacancy) continue

    if (dryRun) {
      console.log(`[dry-run] application ${a.id} job_title='${a.job_title}' -> vacancy_id=${vacancy.id}`)
    } else {
      await prisma.application.update({ where: { id: a.id }, data: { vacancy_id: vacancy.id } })
      console.log(`Updated application ${a.id} -> vacancy_id=${vacancy.id}`)
      updated++
    }
  }

  console.log(dryRun ? `Dry-run complete. ${apps.length} apps would be considered.` : `Done. Updated ${updated} applications.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
