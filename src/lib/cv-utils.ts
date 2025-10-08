import { del } from '@vercel/blob'

/**
 * Utility functions for CV file management
 */

export async function deleteCVFile(fileUrl: string): Promise<boolean> {
  try {
    if (!fileUrl) return true
    
    await del(fileUrl)
    return true
  } catch (error) {
    console.error('Failed to delete CV file:', error)
    return false
  }
}

export function getCVFilename(applicationId: string, originalFilename: string): string {
  const fileExtension = originalFilename.split('.').pop()
  return `${applicationId}.${fileExtension}`
}

export function extractUUIDFromFilename(filename: string): string | null {
  // Extract UUID from filename like "uuid.pdf" or "uuid.docx"
  const match = filename.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\./i)
  return match ? match[1] : null
}

export function isValidCVFileType(mimeType: string): boolean {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  return allowedTypes.includes(mimeType)
}

export function getFileExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: { [key: string]: string } = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
  }
  return mimeToExt[mimeType] || 'dat'
}