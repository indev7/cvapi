'use client'

import { useState, useEffect } from 'react'

interface ApplicationRow {
  id: string
  email?: string | null
  phone?: string | null
  job_title: string
  vacancy?: { id: number; job_title?: string } | null
  cv_file_url?: string | null
  created_at: string
}

export default function AdminBlobsPage() {
  const [rows, setRows] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const perPage = 100
  const [totalPages, setTotalPages] = useState<number>(1)

  useEffect(() => {
    fetchBlobs(page)
  }, [page])

  const fetchBlobs = async (pageNumber = 1) => {
    try {
      setLoading(true)
      const proxyRes = await fetch('/api/internal/proxy', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `/api/admin/blobs?page=${pageNumber}&limit=${perPage}`, method: 'GET' })
      })
      const data = await proxyRes.json()

      if (proxyRes.ok) {
        setRows(data.applications || [])
        setTotalPages(data.pagination?.totalPages || 1)
      } else {
        setError(data.error || 'Failed to fetch CV files')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading blobs...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <div className="admin-row space-between" style={{ marginBottom: '1rem' }}>
        <h1 className="page-title">Blob Storage Browser</h1>
        <div className="admin-actions">
          <div className="muted">Page {page} / {totalPages}</div>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-muted">Prev</button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="btn btn-muted">Next</button>
          <button onClick={() => fetchBlobs(page)} className="btn btn-primary">Refresh</button>
        </div>
      </div>

      <div className="admin-card">
        {rows.length === 0 ? (
          <div className="muted">No CV files found</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Application ID</th>
                  <th>Job Title</th>
                  <th>Vacancy</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>CV File</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.job_title}</td>
                    <td>{row.vacancy?.job_title || '\u2014'}</td>
                    <td>{row.email || '\u2014'}</td>
                    <td>{row.phone || '\u2014'}</td>
                    <td>{row.cv_file_url ? (<a href={row.cv_file_url} target="_blank" rel="noreferrer">View</a>) : '\u2014'}</td>
                    <td>{new Date(row.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem', color: 'var(--muted-text)', fontSize: '0.9rem' }}>
        <p>💡 Tips:</p>
        <ul>
          <li>Files are named with application UUIDs (e.g., uuid.pdf)</li>
          <li>Click &quot;View&quot; to open the CV in a new tab</li>
          <li>Click &quot;Download&quot; to save the file locally</li>
          <li>Files with Application ID can be traced back to database records</li>
        </ul>
      </div>
    </div>
  )
}