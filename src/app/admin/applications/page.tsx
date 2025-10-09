"use client"

import { useEffect, useState, useCallback } from 'react'

interface Vacancy {
  id: number
  job_title?: string | null
}

interface Application {
  id: string
  email?: string | null
  phone?: string | null
  status?: string | null
  job_title?: string | null
  vacancy?: Vacancy | null
  cv_file_url?: string | null
  created_at: string
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [page, setPage] = useState<number>(1)
  const [limit] = useState<number>(100)
  const [totalPages, setTotalPages] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchApplications = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/applications?page=${p}&limit=${limit}`, { credentials: 'include' })
      const data = await res.json()
      setApplications(data.applications || [])
      if (data.pagination) setTotalPages(data.pagination.totalPages)
    } catch (err) {
      console.error('Failed to fetch applications', err)
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchApplications(page)
  }, [page, fetchApplications])

  return (
    <div className="admin-container">
      <div className="admin-row" style={{ marginBottom: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="page-title">Applications ({applications.length})</h1>
        <div className="admin-actions">
          <div className="muted">Page {page}{totalPages ? ` / ${totalPages}` : ''}</div>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-muted">Prev</button>
          <button onClick={() => setPage(p => (totalPages ? Math.min(totalPages, p + 1) : p + 1))} className="btn btn-muted">Next</button>
          <button onClick={() => fetchApplications(page)} className="btn btn-primary">Refresh</button>
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="muted">Loading...</div>
        ) : applications.length === 0 ? (
          <div className="muted">No applications found</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Job</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>CV</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id}>
                    <td>{app.id}</td>
                    <td>{app.vacancy?.job_title || app.job_title}</td>
                    <td>{app.email || '\u2014'}</td>
                    <td>{app.phone || '\u2014'}</td>
                    <td>{app.status}</td>
                    <td>{app.cv_file_url ? (<a href={app.cv_file_url} target="_blank" rel="noreferrer">View</a>) : '\u2014'}</td>
                    <td>{new Date(app.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

