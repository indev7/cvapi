const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // pick an application that exists
  const app = await prisma.application.findFirst({
    where: { ranking: { is: null } },
    select: { id: true }
  })
  if (!app) {
    console.log('No application found to test ranking creation')
    return
  }
  const ranking = await prisma.cvRanking.create({ data: {
    application_id: app.id,
    education_score: 10,
    work_experience_score: 8,
    skill_match_score: 9,
    certifications_score: 5,
    domain_knowledge_score: 7,
    soft_skills_score: 6,
    total_score: 45,
    final_score: 0.85,
    summary: 'Test ranking'
  }})
  console.log('Created ranking id:', ranking.id)
  // cleanup
  await prisma.cvRanking.delete({ where: { id: ranking.id } })
  console.log('Deleted test ranking')
}

main().catch(e => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
