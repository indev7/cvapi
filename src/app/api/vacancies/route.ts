import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAdminAuth } from '@/lib/admin-auth'
import { validateBearer } from '@/lib/api-security'

// Validation schemas
const VacancySchema = z.object({
  job_title: z.string().min(1, 'Job title is required'),
  url: z.string().url().optional(),
  closing_date: z.string().optional(), // ISO date string expected
  status: z.enum(['active', 'inactive']).default('active')
})

export async function GET(request: NextRequest) {
  // Allow either admin auth or BEARER token for machine access
  const authHeader = (request.headers.get('authorization') || '').toLowerCase()
  if (authHeader.startsWith('bearer ')) {
    const bearerErr = validateBearer(request)
    if (bearerErr) return bearerErr
  } else {
    const authError = await requireAdminAuth()
    if (authError) return authError
  }

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
    // convert closing_date string to Date for Prisma if present
    const dataForDb: any = { ...validatedData }
    if (validatedData.closing_date) {
      const d = new Date(validatedData.closing_date)
      if (!isNaN(d.getTime())) dataForDb.closing_date = d
      else delete dataForDb.closing_date
    }

    const vacancy = await prisma.vacancy.create({
      data: dataForDb
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

export async function PUT(request: NextRequest) {
  // Secure admin-only endpoint
  const authError = await requireAdminAuth()
  if (authError) return authError

  try {
    const body = await request.json()
    // Expect id to identify the vacancy
    const id = body.id
    if (!id) {
      return NextResponse.json({ error: 'Missing vacancy id' }, { status: 400 })
    }

    // Validate payload (allow partial but ensure types) - reuse schema and pick fields
    const parsed = VacancySchema.partial().parse(body)
    const dataForDb: any = { ...parsed }
    if (parsed.closing_date) {
      const d = new Date(parsed.closing_date)
      if (!isNaN(d.getTime())) dataForDb.closing_date = d
      else delete dataForDb.closing_date
    }

    const vacancy = await prisma.vacancy.update({ where: { id: Number(id) }, data: dataForDb })
    return NextResponse.json(vacancy)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating vacancy:', error)
    return NextResponse.json({ error: 'Failed to update vacancy' }, { status: 500 })
  }
}