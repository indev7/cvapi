import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'
import { rateLimit, addSecurityHeaders } from '@/lib/api-security'

// Legacy API compatibility endpoint
// Matches the old Google Apps Script UploadAPI.gs format

const LEGACY_API_KEY = "761025-77adoiu-6897987-a6a8wn34-abcd32"

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = rateLimit(request, 5, 60000) // 5 requests per minute
  if (rateLimitResponse) return addSecurityHeaders(rateLimitResponse)

  try {
    // Check if this is the legacy format (like your old Apps Script API)
    const contentType = request.headers.get('content-type') || ''
    
    // Legacy format check - looks for api_key in parameters
    const url = new URL(request.url)
    const apiKey = url.searchParams.get('api_key') || request.headers.get('api_key')
    
    if (apiKey === LEGACY_API_KEY) {
      return handleLegacyUpload(request)
    }
    
    return NextResponse.json(
      { error: 'Invalid API key or format' },
      { status: 401 }
    )
    
  } catch (error) {
    console.error('Legacy upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleLegacyUpload(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const jobTitle = url.searchParams.get('job_title')
    
    if (!jobTitle) {
      return NextResponse.json(
        { status: 'error', message: 'Missing Job_Title' },
        { status: 400 }
      )
    }

    // Check if we have postData (base64 file content)
    const body = await request.text()
    let fileData: Buffer | null = null
    let contentType = 'application/pdf'
    
    if (body) {
      try {
        // Try to decode as base64 (like old Apps Script)
        fileData = Buffer.from(body, 'base64')
      } catch {
        // If not base64, treat as binary data
        fileData = Buffer.from(body)
      }
    }

    // Create application first to get UUID
    const application = await prisma.application.create({
      data: {
        job_title: jobTitle,
        email: '', // Empty like in old system
        phone: '', // Empty like in old system
        source: 'web',
        status: 'pending'
      }
    })

    let cv_file_url = null

    // Upload file if we have data
    if (fileData && fileData.length > 0) {
      // Determine file extension from content or default to PDF
      const extension = contentType.includes('pdf') ? 'pdf' : 
                      contentType.includes('msword') ? 'doc' : 
                      contentType.includes('wordprocessingml') ? 'docx' : 'pdf'
      
      const filename = `${application.id}.${extension}`
      
      try {
        // Create a File-like object from buffer
        const file = new File([new Uint8Array(fileData)], filename, { type: contentType })
        
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
        // Clean up application if upload fails
        await prisma.application.delete({ where: { id: application.id } })
        throw uploadError
      }
    }

    // Return response in old format
    const response = NextResponse.json({
      status: 'success',
      fileId: application.id,
      fileName: cv_file_url ? `${application.id}.pdf` : '',
      fileUrl: cv_file_url || '',
      jobTitle: jobTitle
    })
    
    return addSecurityHeaders(response)

  } catch (error) {
    console.error('Legacy upload processing error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Upload processing failed'
    })
  }
}