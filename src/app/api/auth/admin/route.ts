import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    
    // Get credentials from environment
    const adminUsername = process.env.ADMIN_USERNAME
    const adminPassword = process.env.ADMIN_PASSWORD
    
    if (!adminUsername || !adminPassword) {
      console.error('Admin credentials not configured in environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    // Validate credentials
    if (username === adminUsername && password === adminPassword) {
      // Create response with authentication cookie
      const response = NextResponse.json({ success: true })
      
      // Set secure cookie (expires in 24 hours)
      response.cookies.set('admin-auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 // 24 hours
      })
      
      return response
    } else {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  // Logout endpoint - clear the cookie
  const response = NextResponse.json({ success: true })
  response.cookies.delete('admin-auth')
  return response
}

export async function GET(request: NextRequest) {
  // Return authentication status based on admin-auth cookie
  try {
    const cookie = request.cookies.get('admin-auth')
    const authenticated = !!cookie && cookie.value === 'authenticated'
    return NextResponse.json({ authenticated })
  } catch (err) {
    console.error('Auth status error', err)
    return NextResponse.json({ authenticated: false })
  }
}