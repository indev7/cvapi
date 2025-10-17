import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'

const ALLOWED_PATHS = new Set([
  '/api/vacancies',
  '/api/applications',
  '/api/rankings',
  '/api/admin/blobs',
  '/api/admin/rankings',
  '/api/admin/stats'
])

export async function POST(request: NextRequest) {
  // Only allow admin-authenticated users to use this proxy (do not expose BEARER token to public)
  const authError = await requireAdminAuth()
  if (authError) return authError

  try {
    const body = await request.json()
    const { path, method = 'GET', headers = {}, payload } = body || {}

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 })
    }

    // Allow the client to provide a path with query string. Validate only the pathname.
    // If path is absolute, parse it; otherwise construct URL relative to current origin.
    const proto = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    const origin = `${proto}://${host}`

    let targetUrl: URL
    try {
      targetUrl = new URL(path, origin)
    } catch (err) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    if (!ALLOWED_PATHS.has(targetUrl.pathname)) {
      return NextResponse.json({ error: 'Path not allowed' }, { status: 403 })
    }

    const url = targetUrl.toString()

    // Attach bearer token from environment
    const bearer = process.env.BEARER_TOKEN || ''
    const forwardHeaders: Record<string, string> = {
      'Authorization': `Bearer ${bearer}`,
      ...headers
    }

    const fetchOptions: any = {
      method,
      headers: forwardHeaders
    }

    if (payload !== undefined) {
      fetchOptions.body = typeof payload === 'string' ? payload : JSON.stringify(payload)
      fetchOptions.headers['Content-Type'] = 'application/json'
    }

    const res = await fetch(url, fetchOptions)
    const text = await res.text()
    const contentType = res.headers.get('content-type') || 'application/json'

    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': contentType }
    })
  } catch (err) {
    console.error('Proxy error:', err)
    return NextResponse.json({ error: 'Proxy request failed' }, { status: 500 })
  }
}
