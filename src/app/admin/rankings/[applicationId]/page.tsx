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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Ranking details for {ranking.application.id}</h1>
        <div className="text-sm text-gray-600">Job: {ranking.application.job_title}</div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>Total score:</strong> {ranking.total_score}
          </div>
          <div>
            <strong>Final score:</strong> {String(ranking.final_score)}
          </div>
          <div className="col-span-2">
            <strong>Summary:</strong>
            <div className="mt-2 text-sm text-gray-700">{ranking.summary || '—'}</div>
          </div>
        </div>

        <h3 className="mt-6 mb-2 font-semibold">Evidence / breakdown</h3>
        <table className="min-w-full">
          <tbody>
            <tr><td>Education score</td><td>{ranking.education_score}</td></tr>
            <tr><td>Work experience score</td><td>{ranking.work_experience_score}</td></tr>
            <tr><td>Skill match score</td><td>{ranking.skill_match_score}</td></tr>
            <tr><td>Certifications score</td><td>{ranking.certifications_score}</td></tr>
            <tr><td>Domain knowledge score</td><td>{ranking.domain_knowledge_score}</td></tr>
            <tr><td>Soft skills score</td><td>{ranking.soft_skills_score}</td></tr>
          </tbody>
        </table>

        <div className="mt-4 text-sm text-gray-500">Ranked at: {ranking.ranked_at?.toLocaleString()}</div>
      </div>
    </div>
  )
}
