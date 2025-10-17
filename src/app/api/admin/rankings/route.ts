import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { validateBearer } from '@/lib/api-security'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
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

    const [total, rankings] = await Promise.all([
      prisma.cvRanking.count(),
      prisma.cvRanking.findMany({
        include: { application: true },
        orderBy: { ranked_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      })
    ])

    const totalPages = Math.max(1, Math.ceil(total / limit))

    return NextResponse.json({ rankings, pagination: { page, limit, total, totalPages } })
  } catch (error) {
    console.error('Error fetching rankings:', error)
    return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 })
  }
}
