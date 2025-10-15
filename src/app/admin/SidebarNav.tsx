"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function SidebarNav() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/auth/admin')
        const data = await res.json()
        if (!mounted) return
        setAuthenticated(!!data.authenticated)
      } catch (err) {
        if (!mounted) return
        setAuthenticated(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  // Not authenticated -> render nothing (links hidden)
  if (!authenticated) return null

  return (
    <nav>
      <Link href="/admin/applications" className="admin-nav-link">Applications</Link>
      <Link href="/admin/vacancies" className="admin-nav-link">Vacancies</Link>
    </nav>
  )
}
