#!/usr/bin/env node
/**
 * Iterate all vacancies, count related applications, and store in vacancies.applications_count.
 * Usage:
 *   node scripts/updateVacancyCounts.js [--dry-run] [--vacancy-id <id>]
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
let vacancyId = null
const vidIndex = argv.indexOf('--vacancy-id')
if (vidIndex !== -1 && argv.length > vidIndex + 1) {
  const val = parseInt(argv[vidIndex + 1], 10)
  if (!Number.isNaN(val)) vacancyId = val
}

async function ensureApplicationsCountColumn() {
  const res = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vacancies'
      AND column_name = 'applications_count'
  `

  if (res.length === 0) {
    console.log('applications_count column missing')
    if (dryRun) {
      console.log('[dry-run] would add applications_count as nullable INT with default 0')
    } else {
      console.log('adding applications_count as nullable INT with default 0')
      await prisma.$executeRawUnsafe(`ALTER TABLE public.vacancies ADD COLUMN applications_count integer DEFAULT 0;`)
    }
  }
}

async function main() {
  console.log('Starting vacancy counts update...')

  await ensureApplicationsCountColumn()

  // Support filtering by job title (new vacancies might not have vacancy_id yet)
  const jobTitleIndex = argv.indexOf('--job-title')
  let jobTitleFilter = null
  if (jobTitleIndex !== -1 && argv.length > jobTitleIndex + 1) {
    jobTitleFilter = argv[jobTitleIndex + 1]
  }

  const where = jobTitleFilter ? { where: { job_title: jobTitleFilter } } : vacancyId ? { where: { id: vacancyId } } : {}
  const vacancies = await prisma.vacancy.findMany({ select: { id: true, job_title: true }, ...where })
  console.log(`Found ${vacancies.length} vacancies to process`)

  let processed = 0

  for (const v of vacancies) {
    // Count applications that either reference this vacancy by id,
    // or have no vacancy_id but match on job_title (new records)
    const count = await prisma.application.count({ where: {
      OR: [
        { vacancy_id: v.id },
        { vacancy_id: null, job_title: v.job_title }
      ]
    } })

    if (dryRun) {
      console.log(`[dry-run] vacancy id=${v.id} -> applications_count=${count}`)
    } else {
      await prisma.vacancy.update({ where: { id: v.id }, data: { applications_count: count } })
      console.log(`Updated vacancy id=${v.id} -> applications_count=${count}`)
    }

    processed++
  }

  console.log(dryRun ? `Dry-run complete. ${processed} vacancies would be updated.` : `Done. Updated ${processed} vacancies.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
