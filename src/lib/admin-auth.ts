import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Check if the current request is from an authenticated admin
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('admin-auth')
    return authCookie?.value === 'authenticated'
  } catch {
    return false
  }
}

/**
 * Middleware function to protect admin routes
 * Returns null if authenticated, or error response if not
 */
export async function requireAdminAuth(): Promise<NextResponse | null> {
  const isAuthenticated = await isAdminAuthenticated()
  
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin access required.' },
      { status: 401 }
    )
  }
  
  return null
}

/**
 * Rate limiting for admin actions (basic implementation)
 */
const adminActions = new Map<string, number[]>()

export function checkAdminRateLimit(identifier: string, maxRequests = 100, windowMs = 60000): boolean {
  const now = Date.now()
  const actions = adminActions.get(identifier) || []
  
  // Remove old actions outside the window
  const recentActions = actions.filter(time => now - time < windowMs)
  
  if (recentActions.length >= maxRequests) {
    return false // Rate limited
  }
  
  recentActions.push(now)
  adminActions.set(identifier, recentActions)
  return true
}