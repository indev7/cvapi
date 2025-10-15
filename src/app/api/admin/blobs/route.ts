import { list, del } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  // Check authentication
  const authError = await requireAdminAuth()
  if (authError) return authError
  try {
    const { searchParams } = new URL(request.url)
    const prefix = searchParams.get('prefix') || ''
    const limit = parseInt(searchParams.get('limit') || '100')
    
    // List all blobs with optional prefix filter
    const { blobs } = await list({
      prefix,
      limit
    })
    
    // Format blob data for easier viewing
    const formattedBlobs = blobs.map(blob => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
      // Extract UUID if it matches our naming pattern
      applicationId: blob.pathname.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1] || null
    }))
    
    return NextResponse.json({
      blobs: formattedBlobs,
      total: blobs.length,
      hasMore: blobs.length === limit
    })
  } catch (error) {
    console.error('Error listing blobs:', error)
    return NextResponse.json(
      { error: 'Failed to list blobs' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  // Check authentication
  const authError = await requireAdminAuth()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    
    if (!url) {
      return NextResponse.json(
        { error: 'Missing blob URL parameter' },
        { status: 400 }
      )
    }

    // Delete the blob from Vercel storage
    await del(url)

    // Extract application ID from filename if possible
    const applicationId = url.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1]
    
    // Update application record to remove the file URL
    if (applicationId) {
      await prisma.application.update({
        where: { id: applicationId },
        data: { cv_file_url: null }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Blob deleted successfully',
      deletedUrl: url,
      updatedApplication: applicationId || null
    })

  } catch (error) {
    console.error('Error deleting blob:', error)
    return NextResponse.json(
      { error: 'Failed to delete blob' },
      { status: 500 }
    )
  }
}