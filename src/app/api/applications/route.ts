import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'
import { z } from 'zod'
import { requireAdminAuth } from '@/lib/admin-auth'

// Validation schema
const ApplicationSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  job_title: z.string().min(1, 'Job title is required'),
  vacancy_id: z.number().optional(),
  source: z.enum(['web', 'referral', 'manual']).default('web')
})

export async function GET(request: NextRequest) {
  // Secure admin-only endpoint - contains sensitive data
  const authError = await requireAdminAuth()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const job_title = searchParams.get('job_title')
    const status = searchParams.get('status')
    const email = searchParams.get('email')
    const phone = searchParams.get('phone')
    const submitted_from = searchParams.get('submitted_from')
    const submitted_to = searchParams.get('submitted_to')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // Build prisma where filters. Keep flexible to allow combining filters.
    const where: any = {
      ...(job_title && { job_title }),
      ...(status && { status })
    }

    if (email) {
      where.email = { contains: email, mode: 'insensitive' }
    }
    if (phone) {
      where.phone = { contains: phone }
    }
    if (submitted_from || submitted_to) {
      where.created_at = {}
      if (submitted_from) where.created_at.gte = new Date(submitted_from)
      if (submitted_to) {
        // include entire day for submitted_to
        const toDate = new Date(submitted_to)
        toDate.setHours(23,59,59,999)
        where.created_at.lte = toDate
      }
    }
    
    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          vacancy: true,
          ranking: true
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.application.count({ where })
    ])
    
    return NextResponse.json({
      applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching applications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('cv_file') as File
    const applicationData = {
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      job_title: formData.get('job_title') as string,
      vacancy_id: formData.get('vacancy_id') ? parseInt(formData.get('vacancy_id') as string) : undefined,
      source: (formData.get('source') as string) || 'web'
    }
    
    // Validate application data
    const validatedData = ApplicationSchema.parse(applicationData)
    
    // First create the application to get the UUID
    const application = await prisma.application.create({
      data: validatedData,
      include: {
        vacancy: true
      }
    })
    
    let cv_file_url = null
    
    // Handle file upload if provided - use the application UUID as filename
    if (file && file.size > 0) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!allowedTypes.includes(file.type)) {
        // Delete the application if file upload fails
        await prisma.application.delete({ where: { id: application.id } })
        return NextResponse.json(
          { error: 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.' },
          { status: 400 }
        )
      }
      
      // Get file extension
      const fileExtension = file.name.split('.').pop()
      // Use application UUID as filename: uuid.pdf, uuid.docx, etc.
      const filename = `${application.id}.${fileExtension}`
      
      try {
        // Upload to Vercel Blob
        const blob = await put(filename, file, {
          access: 'public',
        })
        
        cv_file_url = blob.url
        
        // Update application with file URL
        await prisma.application.update({
          where: { id: application.id },
          data: { cv_file_url }
        })
        
      } catch (uploadError) {
        // If upload fails, delete the application record
        await prisma.application.delete({ where: { id: application.id } })
        throw uploadError
      }
    }
    
    // Fetch the final application with updated CV URL
    const finalApplication = await prisma.application.findUnique({
      where: { id: application.id },
      include: { vacancy: true }
    })
    
    return NextResponse.json(finalApplication, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating application:', error)
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    )
  }
}