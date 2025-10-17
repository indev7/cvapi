import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateBearer } from '@/lib/api-security'

const RankingSchema = z.object({
  application_id: z.string().uuid(),
  education_score: z.number().int().nonnegative().optional(),
  work_experience_score: z.number().int().nonnegative().optional(),
  skill_match_score: z.number().int().nonnegative().optional(),
  certifications_score: z.number().int().nonnegative().optional(),
  domain_knowledge_score: z.number().int().nonnegative().optional(),
  soft_skills_score: z.number().int().nonnegative().optional(),
  total_score: z.number().int().optional(),
  final_score: z.number().optional(),
  summary: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const { pathname } = new URL(request.url)
    const parts = pathname.split('/')
    const applicationId = parts[parts.length - 1]
    if (!applicationId) return NextResponse.json({ error: 'Missing application id' }, { status: 400 })
    // Auth: accept either Bearer token OR admin session
    const authHeader = (request.headers.get('authorization') || '').toLowerCase()
    if (authHeader.startsWith('bearer ')) {
      const bearerErr = validateBearer(request)
      if (bearerErr) return bearerErr
    } else {
      const { requireAdminAuth } = await import('@/lib/admin-auth')
      const authError = await requireAdminAuth()
      if (authError) return authError
    }

    const ranking = await prisma.cvRanking.findUnique({ where: { application_id: applicationId } })
    if (!ranking) return NextResponse.json({ error: 'Ranking not found' }, { status: 404 })
    return NextResponse.json(ranking)
  } catch (error) {
    console.error('Error fetching ranking:', error)
    return NextResponse.json({ error: 'Failed to fetch ranking' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require either BEARER token or admin auth
    const authHeader = (request.headers.get('authorization') || '').toLowerCase()
    if (authHeader.startsWith('bearer ')) {
      const bearerErr = validateBearer(request)
      if (bearerErr) return bearerErr
    } else {
      const { requireAdminAuth } = await import('@/lib/admin-auth')
      const authError = await requireAdminAuth()
      if (authError) return authError
    }
    const body = await request.json()
    const parsed = RankingSchema.parse(body)

    // Compute totals if not provided
    const total = parsed.total_score ?? (
      (parsed.education_score || 0) + (parsed.work_experience_score || 0) + (parsed.skill_match_score || 0) + (parsed.certifications_score || 0) + (parsed.domain_knowledge_score || 0) + (parsed.soft_skills_score || 0)
    )

    const ranking = await prisma.cvRanking.create({ data: {
      application_id: parsed.application_id,
      education_score: parsed.education_score ?? 0,
      education_evidence: null,
      work_experience_score: parsed.work_experience_score ?? 0,
      work_experience_evidence: null,
      skill_match_score: parsed.skill_match_score ?? 0,
      skill_match_evidence: null,
      certifications_score: parsed.certifications_score ?? 0,
      certifications_evidence: null,
      domain_knowledge_score: parsed.domain_knowledge_score ?? 0,
      domain_knowledge_evidence: null,
      soft_skills_score: parsed.soft_skills_score ?? 0,
      soft_skills_evidence: null,
      total_score: total,
      final_score: parsed.final_score ?? 0,
      summary: parsed.summary ?? null
    }})

    // Optionally mark application as ranked
    await prisma.application.update({ where: { id: parsed.application_id }, data: { status: 'ranked' } }).catch(() => null)

    return NextResponse.json(ranking, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Error saving ranking:', error)
    return NextResponse.json({ error: 'Failed to save ranking' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = (request.headers.get('authorization') || '').toLowerCase()
    if (authHeader.startsWith('bearer ')) {
      const bearerErr = validateBearer(request)
      if (bearerErr) return bearerErr
    } else {
      const { requireAdminAuth } = await import('@/lib/admin-auth')
      const authError = await requireAdminAuth()
      if (authError) return authError
    }
    const { pathname } = new URL(request.url)
    const parts = pathname.split('/')
    const applicationId = parts[parts.length - 1]
    if (!applicationId) return NextResponse.json({ error: 'Missing application id' }, { status: 400 })

    const body = await request.json()
    const parsed = RankingSchema.partial().parse(body)

    const dataForDb: any = { ...parsed }
    const ranking = await prisma.cvRanking.update({ where: { application_id: applicationId }, data: dataForDb })
    return NextResponse.json(ranking)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Error updating ranking:', error)
    return NextResponse.json({ error: 'Failed to update ranking' }, { status: 500 })
  }
}
