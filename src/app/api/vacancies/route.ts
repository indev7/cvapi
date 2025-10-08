import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAdminAuth } from '@/lib/admin-auth'

// Validation schemas
const VacancySchema = z.object({
  job_title: z.string().min(1, 'Job title is required'),
  url: z.string().url().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active')
})

export async function GET() {
  // Secure admin-only endpoint
  const authError = await requireAdminAuth()
  if (authError) return authError

  try {
    const vacancies = await prisma.vacancy.findMany({
      include: {
        applications: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    // Add application count to each vacancy
    const vacanciesWithCounts = vacancies.map(vacancy => ({
      ...vacancy,
      applicationCount: vacancy.applications.length,
      pendingCount: vacancy.applications.filter(app => app.status === 'pending').length
    }))

    return NextResponse.json(vacanciesWithCounts)
  } catch (error) {
    console.error('Error fetching vacancies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vacancies' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Secure admin-only endpoint
  const authError = await requireAdminAuth()
  if (authError) return authError

  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = VacancySchema.parse(body)
    
    const vacancy = await prisma.vacancy.create({
      data: validatedData
    })
    
    return NextResponse.json(vacancy, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating vacancy:', error)
    return NextResponse.json(
      { error: 'Failed to create vacancy' },
      { status: 500 }
    )
  }
}