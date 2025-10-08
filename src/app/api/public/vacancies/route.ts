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
        job_title: true,
        url: true
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    // Transform to match original Google Apps Script format
    const formattedVacancies = vacancies.map(vacancy => ({
      Job_Title: vacancy.job_title,
      URL: vacancy.url
    }))

    return NextResponse.json(formattedVacancies)
  } catch (error) {
    console.error('Error fetching public vacancies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job listings' },
      { status: 500 }
    )
  }
}