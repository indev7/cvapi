import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public endpoint for job listings (no sensitive data)
export async function GET() {
  try {
    const vacancies = await prisma.vacancy.findMany({
      where: {
        status: 'active' // Only show active positions
      },
      select: {
        id: true,
        job_title: true,
        url: true,
        description: true,
        created_at: true
        // No sensitive data exposed
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return NextResponse.json({
      vacancies,
      total: vacancies.length
    })
  } catch (error) {
    console.error('Error fetching public vacancies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job listings' },
      { status: 500 }
    )
  }
}