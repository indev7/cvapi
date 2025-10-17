"use client"

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function SidebarLogout() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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

  if (!authenticated) return null

  const handleLogout = async () => {
    setLoading(true)
    try {
      await fetch('/api/auth/admin', { method: 'DELETE' })
      // Force a full page reload to ensure auth state is re-evaluated server-side
      window.location.href = '/admin/login'
    } catch (err) {
      console.error('Logout failed', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
      <button onClick={handleLogout} disabled={loading} className="btn btn-muted full-width">
        {loading ? 'Logging out...' : 'Logout'}
      </button>
    </div>
  )
}
