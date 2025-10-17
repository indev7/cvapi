import { prisma } from '@/lib/prisma'

export default async function RankingDetailPage({ params }: any) {
  // `params` can be a promise in some Next.js runtime cases; await it before using.
  const { applicationId } = await params

  // Fetch ranking and related application
  const ranking = await prisma.cvRanking.findUnique({
    where: { application_id: applicationId },
    include: { application: true }
  })

  if (!ranking) {
    return <div className="p-6">No ranking found for application {applicationId}</div>
  }

  const applicantEmail = ranking.application?.email || ranking.application.id

  const breakdowns = [
    { key: 'education', label: 'Education', score: ranking.education_score, evidence: ranking.education_evidence, cutoff: 10 },
    { key: 'work_experience', label: 'Work Experience', score: ranking.work_experience_score, evidence: ranking.work_experience_evidence, cutoff: 25 },
    { key: 'skill_match', label: 'Skill Match', score: ranking.skill_match_score, evidence: ranking.skill_match_evidence, cutoff: 30 },
    { key: 'certifications', label: 'Certifications', score: ranking.certifications_score, evidence: ranking.certifications_evidence, cutoff: 10 },
    { key: 'domain_knowledge', label: 'Domain Knowledge', score: ranking.domain_knowledge_score, evidence: ranking.domain_knowledge_evidence, cutoff: 10 },
    { key: 'soft_skills', label: 'Soft Skills', score: ranking.soft_skills_score, evidence: ranking.soft_skills_evidence, cutoff: 15 }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{applicantEmail}</h1>
        <div className="mt-6 mb-2 font-semibold">Job: {ranking.application.job_title}</div>
      </div>

      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="mt-6 mb-2 font-semibold">Total score</div>
            <div className="text-3xl font-extrabold">{ranking.total_score}</div>
          </div>
          <div>
            <div className="mt-6 mb-2 font-semibold">Final score</div>
            <div className="text-2xl font-semibold text-teal-600">{String(ranking.final_score)}</div>
          </div>
          <div className="md:max-w-lg">
            <div className="mt-6 mb-2 font-semibold">Summary</div>
            <div className="mt-1 text-sm text-gray-700">{ranking.summary || '—'}</div>
          </div>
        </div>

        <h3 className="mt-6 mb-2 font-semibold">Score Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {breakdowns.map((b: any) => (
            <div key={b.key} className="border rounded p-3 bg-white shadow-sm">
              <div className="flex items-baseline justify-between">
                <div className="text-base md:text-lg font-semibold text-gray-700">{b.label}</div>
                <div className="text-xl font-bold text-indigo-600">{b.score}/{b.cutoff}</div>
              </div>
              <div className="mt-2 text-sm text-gray-700">{b.evidence ? b.evidence : <span className="text-gray-400">No evidence recorded</span>}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-sm text-gray-500">Ranked at: {ranking.ranked_at?.toLocaleString()}</div>
      </div>
    </div>
  )
}
