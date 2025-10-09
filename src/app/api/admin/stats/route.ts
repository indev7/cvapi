import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/admin-auth'

export async function GET() {
  const authError = await requireAdminAuth()
  if (authError) return authError

  try {
    const [totalApplications, cvFilesCount, pendingRankings, activeVacancies] = await Promise.all([
      prisma.application.count(),
      prisma.application.count({ where: { cv_file_url: { not: null } } }),
      prisma.cvRanking.count(),
      prisma.vacancy.count({ where: { status: 'active' } })
    ])

    return NextResponse.json({
      totalApplications,
      cvFilesCount,
      pendingRankings,
      activeVacancies
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
