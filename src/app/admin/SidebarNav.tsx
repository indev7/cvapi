"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'

export default function SidebarNav() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [vacancies, setVacancies] = useState<Array<{ id: number; job_title?: string | null }>>([])
  const [open, setOpen] = useState(false)
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
      } catch (err) {
        if (!mounted) return
        setAuthenticated(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  // Fetch vacancies for the dropdown after authentication
  useEffect(() => {
    if (!authenticated) return
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/vacancies', { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to load vacancies')
        const data = await res.json()
        if (!mounted) return
        if (Array.isArray(data)) {
          setVacancies(data.map((v: any) => ({ id: v.id, job_title: v.job_title })))
        }
      } catch (err) {
        console.error('Failed to fetch vacancies for sidebar', err)
      }
    })()
    return () => { mounted = false }
  }, [authenticated])

  // Not authenticated -> render nothing (links hidden)
  if (!authenticated) return null

  return (
    <nav>
      <a href="#" onClick={(e) => { e.preventDefault(); router.push('/admin/applications'); setOpen(!open) }} className="admin-nav-link">Applications</a>
      {open && (
        <div className="sidebar-vacancies">
          {vacancies.length === 0 ? (
            <div className="muted">Loading...</div>
          ) : (
            vacancies.map(v => (
              <a key={v.id} href="#" className="admin-sub-link" onClick={(e) => { e.preventDefault(); router.push(`/admin/applications?job_title=${encodeURIComponent(v.job_title || '')}`) }}>{v.job_title}</a>
            ))
          )}
        </div>
      )}
      <Link href="/admin/vacancies" className="admin-nav-link">Vacancies</Link>
    </nav>
  )
}
