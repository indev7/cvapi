"use client"

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<{ totalApplications: number; cvFilesCount: number; pendingRankings: number; activeVacancies: number } | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/admin', {
        method: 'DELETE'
      })
      // Force a full navigation so middleware and server state are refreshed
      window.location.href = '/admin/login'
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true)
        const res = await fetch('/api/admin/stats', { credentials: 'include' })
        const data = await res.json()
        if (!res.ok) {
          setStatsError(data.error || 'Failed to load stats')
          return
        }
        setStats(data)
      } catch (err) {
        setStatsError('Network error')
      } finally {
        setLoadingStats(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="admin-container">
      <div className="admin-row space-between" style={{ alignItems: 'center' }}>
        <h1 className="page-title">CV Submission Admin</h1>
        <div className="admin-actions">
          <button onClick={handleLogout} className="btn btn-muted">Logout</button>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {/* Blob Storage Browser */}
        <div className="admin-card">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Blob Storage</h3>
          <p className="muted" style={{ marginBottom: '0.75rem' }}>Browse and manage uploaded CV files</p>
          <a href="/admin/blobs" className="btn btn-primary">Browse Files</a>
        </div>

        {/* Applications Management */}
        <div className="admin-card">
          <div className="flex items-center mb-4">
            <div className="bg-green-100 rounded-full p-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Applications</h3>
          <p className="muted" style={{ marginBottom: '0.75rem' }}>View and manage CV applications</p>
          <a href="/admin/applications" className="btn btn-primary">View Applications</a>
        </div>

        {/* Database Browser */}
        <div className="admin-card">
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 rounded-full p-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Database</h3>
          <p className="muted" style={{ marginBottom: '0.75rem' }}>Browse database with Prisma Studio</p>
          <div className="space-y-2">
            <div className="text-sm text-gray-500">
              Run: <code className="bg-gray-100 px-1 rounded">npx prisma studio</code>
            </div>
            <a href="http://localhost:5555" target="_blank" rel="noopener noreferrer" className="btn btn-primary">Open Prisma Studio</a>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Quick Stats</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div className="stat-card stat-blue">
            <div className="stat-number">{loadingStats ? '…' : stats ? stats.totalApplications : '-'}</div>
            <div className="stat-label">Total Applications</div>
          </div>
          <div className="stat-card stat-green">
            <div className="stat-number">{loadingStats ? '…' : stats ? stats.cvFilesCount : '-'}</div>
            <div className="stat-label">CV Files</div>
          </div>
          <div className="stat-card stat-yellow">
            <div className="stat-number">{loadingStats ? '…' : stats ? stats.pendingRankings : '-'}</div>
            <div className="stat-label">Pending Rankings</div>
          </div>
          <div className="stat-card stat-purple">
            <div className="stat-number">{loadingStats ? '…' : stats ? stats.activeVacancies : '-'}</div>
            <div className="stat-label">Active Vacancies</div>
          </div>
        </div>
        {statsError && <div className="mt-2 text-red-600">Error loading stats: {statsError}</div>}
      </div>
    </div>
  )
}
