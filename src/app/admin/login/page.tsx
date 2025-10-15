'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get('redirect') || '/admin/applications'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Use full navigation so middleware runs and app reloads with auth cookie set
        window.location.href = redirectPath
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center admin-root" style={{ padding: '3rem 1rem' }}>
      <div className="admin-card" style={{ width: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Admin Login</h2>
          <p className="muted">CV Submission System Administration</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <label htmlFor="username" className="sr-only">Username</label>
            <input id="username" name="username" type="text" required className="admin-input full-width" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input id="password" name="password" type="password" required className="admin-input full-width" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
          </div>

          {error && <div className="admin-error">{error}</div>}

          <div>
            <button type="submit" disabled={loading} className="btn btn-primary full-width">{loading ? 'Signing in...' : 'Sign in'}</button>
          </div>
        </form>

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', color: 'var(--muted-text)' }}>Security Notice</div>
          <div className="muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>🔒 This area is restricted to authorized personnel only</div>
        </div>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}