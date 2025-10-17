import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { validateBearer } from '@/lib/api-security'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  // Allow BEARER token or admin auth
  const authHeader = (request.headers.get('authorization') || '').toLowerCase()
  if (authHeader.startsWith('bearer ')) {
    const bearerErr = validateBearer(request)
    if (bearerErr) return bearerErr
  } else {
    const authError = await requireAdminAuth()
    if (authError) return authError
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')

    const where = { cv_file_url: { not: null } }

    const [total, applications] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        include: { vacancy: true },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      })
    ])

    const totalPages = Math.max(1, Math.ceil(total / limit))

    return NextResponse.json({
      applications,
      pagination: { page, limit, total, totalPages }
    })
  } catch (error) {
    console.error('Error fetching CV files from DB:', error)
    return NextResponse.json({ error: 'Failed to fetch CV files' }, { status: 500 })
  }
}