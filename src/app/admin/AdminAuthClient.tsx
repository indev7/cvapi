"use client"

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export default function AdminAuthClient({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/auth/admin')
        const data = await res.json()
        if (!mounted) return
        setAuthenticated(!!data.authenticated)

        // If user is trying to access an admin route and not authenticated, redirect to login
        if (pathname && pathname.startsWith('/admin') && !data.authenticated) {
          // allow /admin/login
          if (pathname !== '/admin/login') {
            const loginUrl = new URL('/admin/login', window.location.href)
            loginUrl.searchParams.set('redirect', pathname)
            // Force full navigation to ensure server-side middleware runs
            window.location.href = loginUrl.toString()
          }
        }
      } catch (err) {
        console.error('Auth check failed', err)
        if (!mounted) return
        setAuthenticated(false)
        if (pathname && pathname !== '/admin/login' && pathname.startsWith('/admin')) {
          const loginUrl = new URL('/admin/login', window.location.href)
          loginUrl.searchParams.set('redirect', pathname)
          window.location.href = loginUrl.toString()
        }
      }
    })()

    return () => { mounted = false }
  }, [pathname, router])

  // While we haven't determined auth state, render nothing to avoid flashing
  if (authenticated === null) return null

  return <>{children}</>
}
