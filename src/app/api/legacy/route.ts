import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addSecurityHeaders } from '@/lib/api-security'

// Legacy API endpoint that matches Google Apps Script ApiEnpoint.gs
// Supports: ?token=xxx&path=xxx&action=vacancies
// Supports: ?token=xxx&path=xxx&action=applicants&job=JobTitle
// Supports: ?token=xxx&path=xxx&action=emptyMail

const API_TOKEN = "891023-77adoiu-6897987-a6a8wn34-iouo32"
const API_PATH = "bx23iois32is"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const path = searchParams.get('path')
    const action = searchParams.get('action') || 'applicants'
    const jobTitle = searchParams.get('job')

    // Security check (matches ApiEnpoint.gs)
    if (!token || token !== API_TOKEN || !path || path !== API_PATH) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Unauthorized.' },
        { status: 401 }
      ))
    }

    // Handle different actions
    switch (action) {
      case 'vacancies':
        return await handleVacanciesAction()
      
      case 'emptyMail':
        return await handleEmptyMailAction()
      
      case 'applicants':
      default:
        if (!jobTitle) {
          return addSecurityHeaders(NextResponse.json(
            { error: "Missing 'job' parameter." },
            { status: 400 }
          ))
        }
        return await handleApplicantsAction(jobTitle)
    }

  } catch (error) {
    console.error('Legacy API error:', error)
    return addSecurityHeaders(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ))
  }
}

async function handleVacanciesAction() {
  try {
    const vacancies = await prisma.vacancy.findMany({
      where: { status: 'active' },
      select: {
        job_title: true,
        url: true
      },
      orderBy: { created_at: 'desc' }
    })

    // Transform to match Google Apps Script format
    const formattedVacancies = vacancies.map(vacancy => ({
      Job_Title: vacancy.job_title,
      URL: vacancy.url
    }))

    return addSecurityHeaders(NextResponse.json(formattedVacancies))
  } catch (error) {
    throw error
  }
}

async function handleEmptyMailAction() {
  try {
    const applications = await prisma.application.findMany({
      where: {
        email: '' // Only include rows with empty Email
      },
      select: {
        id: true,
        email: true,
        phone: true,
        job_title: true,
        cv_file_url: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    })

    // Transform to match Google Apps Script format
    const formattedApplications = applications.map(app => ({
      ID: app.id,
      Email: app.email,
      Phone: app.phone,
      Job_Title: app.job_title,
      'CV File URL': app.cv_file_url || '',
      Rank: '' // Always empty as per original
    }))

    return addSecurityHeaders(NextResponse.json(formattedApplications))
  } catch (error) {
    throw error
  }
}

async function handleApplicantsAction(jobTitle: string) {
  try {
    // Get all ranked application IDs
    const rankedApplications = await prisma.cvRanking.findMany({
      select: { application_id: true }
    })
    const rankedIds = new Set(rankedApplications.map(r => r.application_id))

    // Get applications for the specific job title, excluding ranked ones
    const applications = await prisma.application.findMany({
      where: {
        job_title: jobTitle,
        id: {
          notIn: Array.from(rankedIds) as string[]
        }
      },
      select: {
        id: true,
        email: true,
        phone: true,
        job_title: true,
        cv_file_url: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    })

    // Transform to match Google Apps Script format
    const formattedApplications = applications.map(app => ({
      ID: app.id,
      Email: app.email || '',
      Phone: app.phone || '',
      Job_Title: app.job_title,
      'CV File URL': app.cv_file_url || '',
      Rank: '' // Always empty for unranked applications
    }))

    return addSecurityHeaders(NextResponse.json(formattedApplications))
  } catch (error) {
    throw error
  }
}