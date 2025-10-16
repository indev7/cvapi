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
    // Parse URL parameters (matches Google Apps Script format)
    const url = new URL(request.url)
    const apiKey = url.searchParams.get('api_key')
    const jobTitle = url.searchParams.get('job_title')
    
    // Security check - matches original UploadAPI.gs
    if (!apiKey || apiKey !== LEGACY_API_KEY) {
      return addSecurityHeaders(NextResponse.json({
        status: 'error', 
        message: 'Unauthorized'
      }, { status: 401 }))
    }

    // Check for required job_title parameter
    if (!jobTitle) {
      return addSecurityHeaders(NextResponse.json({
        status: 'error', 
        message: 'Missing Job_Title'
      }, { status: 400 }))
    }

    return await handleLegacyUpload(request, jobTitle)
    
  } catch (error) {
    console.error('Legacy upload error:', error)
    return addSecurityHeaders(NextResponse.json({
      status: 'error', 
      message: error instanceof Error ? error.message : 'Upload failed'
    }, { status: 500 }))
  }
}

async function handleLegacyUpload(request: NextRequest, jobTitle: string) {
  try {
    // Get request body (should be base64 encoded file data like Google Apps Script)
    const body = await request.text()
    let fileData: Buffer | null = null
    let contentType = 'application/pdf'
    
    if (body) {
      try {
        // Decode base64 data (matches Google Apps Script format)
        fileData = Buffer.from(body, 'base64')
        
        // Try to determine content type from first few bytes
        if (fileData.length > 0) {
          const header = fileData.toString('hex', 0, 8).toUpperCase()
          if (header.startsWith('25504446')) { // PDF signature
            contentType = 'application/pdf'
          } else if (header.startsWith('504B0304')) { // ZIP/DOCX signature
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          } else if (header.startsWith('D0CF11E0')) { // DOC signature
            contentType = 'application/msword'
          }
        }
      } catch {
        return addSecurityHeaders(NextResponse.json({
          status: 'error',
          message: 'Invalid file data format'
        }, { status: 400 }))
      }
    }

    // Try to resolve vacancy_id from jobTitle (new records may not provide vacancy_id)
    const vacancy = await prisma.vacancy.findFirst({ where: { job_title: jobTitle }, orderBy: { created_at: 'desc' } })

    // Create application first to get UUID (matches Google Apps Script behavior)
    const application = await prisma.application.create({
      data: {
        job_title: jobTitle,
        email: '', // Empty like in old system
        phone: '', // Empty like in old system
        vacancy_id: vacancy ? vacancy.id : undefined,
        source: 'web',
        status: 'pending'
      }
    })

    let cv_file_url = ''
    let fileName = ''

    // Upload file if we have data
    if (fileData && fileData.length > 0) {
      // Determine file extension
      const extension = contentType.includes('pdf') ? 'pdf' : 
                      contentType.includes('msword') ? 'doc' : 
                      contentType.includes('wordprocessingml') ? 'docx' : 'pdf'
      
      fileName = `${application.id}.${extension}`
      
      try {
        // Upload to Vercel Blob
        const blob = await put(fileName, fileData, {
          access: 'public',
          contentType: contentType
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

    // Return response matching Google Apps Script format exactly
    const response = NextResponse.json({
      status: 'success',
      fileId: application.id, // UUID like Google Apps Script
      fileName: fileName,
      fileUrl: cv_file_url,
      jobTitle: jobTitle
    })
    
    return addSecurityHeaders(response)

  } catch (error) {
    console.error('Legacy upload processing error:', error)
    return addSecurityHeaders(NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Upload processing failed'
    }, { status: 500 }))
  }
}