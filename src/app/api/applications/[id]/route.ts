import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

import { validateBearer } from '@/lib/api-security'

const UpdateApplicationSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  job_title: z.string().min(1).optional(),
  vacancy_id: z.number().int().optional()
})

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
    const parsed = UpdateApplicationSchema.parse(body)

    // Prepare update data only with provided fields
    const data: any = {}
    if (parsed.email !== undefined) data.email = parsed.email
    if (parsed.phone !== undefined) data.phone = parsed.phone
    if (parsed.job_title !== undefined) data.job_title = parsed.job_title
    if (parsed.vacancy_id !== undefined) data.vacancy_id = parsed.vacancy_id

    const updated = await prisma.application.update({ where: { id: applicationId }, data, include: { vacancy: true, ranking: true } })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Error updating application:', error)
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
  }
}
