import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, number[]>()

export function rateLimit(
  request: NextRequest,
  limit: number = 10,
  windowMs: number = 60000 // 1 minute
): NextResponse | null {
  const ip = request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown'
  const now = Date.now()
  
  // Get existing requests for this IP
  const requests = rateLimitMap.get(ip) || []
  
  // Filter out old requests outside the window
  const recentRequests = requests.filter(time => now - time < windowMs)
  
  // Check if limit exceeded
  if (recentRequests.length >= limit) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${limit} per ${windowMs/1000}s`
      },
      { status: 429 }
    )
  }
  
  // Add current request
  recentRequests.push(now)
  rateLimitMap.set(ip, recentRequests)
  
  return null // No rate limiting
}

export function validateContentType(
  request: NextRequest,
  allowedTypes: string[]
): NextResponse | null {
  const contentType = request.headers.get('content-type') || ''
  
  const isAllowed = allowedTypes.some(type => 
    contentType.toLowerCase().includes(type.toLowerCase())
  )
  
  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Invalid content type' },
      { status: 400 }
    )
  }
  
  return null
}

export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  return response
}

export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Basic XSS prevention
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput)
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value)
    }
    return sanitized
  }
  
  return input
}