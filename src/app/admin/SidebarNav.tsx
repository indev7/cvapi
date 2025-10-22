"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export default function SidebarNav() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [vacancies, setVacancies] = useState<Array<{ id: number; job_title?: string | null; applicationCount?: number }>>([])
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

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
        const proxyRes = await fetch('/api/internal/proxy', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: '/api/vacancies', method: 'GET' })
        })
        if (!proxyRes.ok) throw new Error('Failed to load vacancies')
        const data = await proxyRes.json()
        if (!mounted) return
        if (Array.isArray(data)) {
          setVacancies(data.map((v: any) => ({ id: v.id, job_title: v.job_title, applicationCount: v.applicationCount ?? v.applicationCount ?? 0 })))
        }
      } catch (err) {
        console.error('Failed to fetch vacancies for sidebar', err)
      }
    })()
    return () => { mounted = false }
  }, [authenticated])

  // When the sidebar hydrates, check for any pre-set highlight requested by
  // server-rendered pages (ranking detail injects window.__SIDEBAR_HIGHLIGHT).
  useEffect(() => {
    try {
      const pre = (window as any).__SIDEBAR_HIGHLIGHT
      if (pre) {
        setHighlighted(pre)
        setOpen(true)
        // allow vacancies to load and then scroll into view
        setTimeout(() => {
          try {
            const el = document.getElementById(`vac-${String(pre).replace(/[^a-z0-9_-]/gi, '-')}`)
            if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center', behavior: 'smooth' })
          } catch (e) { /* ignore */ }
        }, 300)
      }
    } catch (e) { /* ignore */ }
  }, [])

  // Listen for explicit highlight events (dispatched by other admin pages)
  useEffect(() => {
    const handler = (evt: any) => {
      try {
        const jt = evt?.detail?.job_title
        if (jt) {
          setHighlighted(jt)
          setOpen(true)
          // scroll into view when available
          setTimeout(() => {
            try {
              const el = document.getElementById(`vac-${String(jt).replace(/[^a-z0-9_-]/gi, '-')}`)
              if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center', behavior: 'smooth' })
            } catch (e) { /* ignore */ }
          }, 30)
        }
      } catch (e) { /* ignore */ }
    }

    window.addEventListener('sidebar-highlight', handler as EventListener)

    return () => {
      window.removeEventListener('sidebar-highlight', handler as EventListener)
    }
  }, [])

  // Also open/highlight when URL search param job_title is present
  useEffect(() => {
    try {
      const jt = searchParams?.get('job_title')
      if (jt) {
        setHighlighted(jt)
        setOpen(true)
      }
    } catch (e) { /* ignore */ }
  }, [searchParams])

  // Not authenticated -> render nothing (links hidden)
  if (!authenticated) return null

  return (
    <nav>
      {/* Top-level nav items - visually distinct */}
      <a
        href="#"
        onClick={async (e) => { e.preventDefault(); await router.push('/admin/applications'); setOpen(!open) }}
        className="admin-nav-link top-level"
        style={{ fontWeight: 700, fontSize: '0.98rem', display: 'block', padding: '0.5rem 0' }}
      >
        Applications
      </a>

      {open && (
        <div className="sidebar-vacancies">
          {vacancies.length === 0 ? (
            <div className="muted">Loading...</div>
          ) : (
            vacancies.map(v => {
              const safeId = `vac-${String(v.job_title ?? v.id).replace(/[^a-z0-9_-]/gi, '-')}`
              const isActive = highlighted && v.job_title === highlighted
              return (
                <a
                  id={safeId}
                  key={v.id}
                  href={`/admin/applications?job_title=${encodeURIComponent(v.job_title || '')}`}
                  className={`admin-sub-link secondary ${isActive ? 'vacancy-active' : ''}`}
                  onClick={async (e) => {
                    e.preventDefault();
                    await router.push(`/admin/applications?job_title=${encodeURIComponent(v.job_title || '')}`)
                    try {
                      window.dispatchEvent(new CustomEvent('locationchange', { detail: { job_title: v.job_title } }))
                    } catch (err) { /* ignore */ }
                  }}
                  style={{ display: 'block', padding: '0.25rem 0 0.25rem 0.6rem', fontSize: '0.92rem', color: 'var(--muted-text)', overflow: 'hidden' }}
                >
                  <span className="vacancy-inner" style={{ display: 'inline-block', width: '100%', verticalAlign: 'middle' }}>
                    <span className="marquee" style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', gap: '0.4rem' }}>
                      <span className="title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.job_title}</span>
                      <span className="count" style={{ color: 'var(--muted-text)', fontSize: '0.85rem', marginLeft: '0.4rem', flex: '0 0 auto' }}>({v.applicationCount ?? 0})</span>
                    </span>
                  </span>
                </a>
              )
            })
          )}
        </div>
      )}

      {/* Top-level Vacancies link */}
      <Link
        href="/admin/vacancies"
        className="admin-nav-link top-level"
        style={{ fontWeight: 700, fontSize: '0.98rem', display: 'block', padding: '0.5rem 0' }}
      >
        Vacancies
      </Link>
    </nav>
  )
}
