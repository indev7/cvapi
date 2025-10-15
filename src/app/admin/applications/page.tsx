"use client"

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

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
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchJobTitle, setSearchJobTitle] = useState<string>('')
  const [searchEmail, setSearchEmail] = useState<string>('')
  const [searchPhone, setSearchPhone] = useState<string>('')
  const [searchFrom, setSearchFrom] = useState<string>('')
  const [searchDate, setSearchDate] = useState<string>('')
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [vacanciesLoading, setVacanciesLoading] = useState(false)
  const [vacanciesError, setVacanciesError] = useState<string | null>(null)

  const fetchApplications = useCallback(async (p = 1, params: Record<string,string> = {}) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ page: String(p), limit: String(limit), ...params })
      const res = await fetch(`/api/applications?${qs.toString()}`, { credentials: 'include' })
      const data = await res.json()
      setApplications(data.applications || [])
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages)
        setTotalCount(data.pagination.total || null)
      }
    } catch (err) {
      console.error('Failed to fetch applications', err)
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchApplications(page)
  }, [page, fetchApplications])

  // Fetch vacancies when search modal is opened
  useEffect(() => {
    if (!showSearch) return
    let mounted = true
    ;(async () => {
      try {
        setVacanciesLoading(true)
        setVacanciesError(null)
        // include credentials so admin endpoints that require auth work
        const res = await fetch('/api/vacancies', { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to fetch vacancies')
        const data = await res.json()
        // data may come in multiple shapes:
        // - admin: array of vacancy objects with id and job_title
        // - public: array of { Job_Title }
        let mapped: Vacancy[] = []
        if (Array.isArray(data)) {
          mapped = data.map((v: any, i: number) => {
            if (v.id && v.job_title) return { id: v.id, job_title: v.job_title }
            if (v.Job_Title) return { id: i, job_title: v.Job_Title }
            // fallback: try common fields
            return { id: v.id ?? i, job_title: v.job_title ?? v.Job_Title ?? '' }
          })
        }
        if (mounted) setVacancies(mapped)
      } catch (err: any) {
        console.error('Vacancies fetch error', err)
        if (mounted) setVacanciesError(err?.message || 'Failed to load')
      } finally {
        if (mounted) setVacanciesLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [showSearch])

  return (
    <div className="admin-container">
      <div className="admin-row" style={{ marginBottom: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
  <h1 className="page-title">Intervest Job Applications ({totalCount ?? applications.length})</h1>
        <div className="admin-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={() => setShowSearch(true)} className="btn btn-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
              <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />
            </svg>
            Search
          </button>
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
                  <th>Applicant Email</th>
                  <th>Applicant Phone</th>
                  <th>Job Title</th>
                  <th>Submitted Date</th>
                  <th>View CV</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/admin/rankings/${app.id}`}>
                    <td>
                      <Link href={`/admin/rankings/${app.id}`} className="admin-link" onClick={(e) => e.stopPropagation()}>{app.id}</Link>
                    </td>
                    <td>{app.email || '\u2014'}</td>
                    <td>{app.phone || '\u2014'}</td>
                    <td>{app.vacancy?.job_title || app.job_title}</td>
                    <td>{new Date(app.created_at).toLocaleString()}</td>
                    <td>{app.cv_file_url ? (<a href={app.cv_file_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>View</a>) : '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2 className="modal-title">Search Applications</h2>
            <div className="modal-body">
              <label className="label">Job Title</label>
              {vacanciesLoading ? (
                <div className="muted">Loading job titles...</div>
              ) : vacanciesError ? (
                <div className="muted">Failed to load job titles</div>
              ) : (
                <select value={searchJobTitle} onChange={e => setSearchJobTitle(e.target.value)} className="input">
                  <option value="">-- Any --</option>
                  {vacancies.map(v => (
                    <option key={v.id} value={v.job_title || ''}>{v.job_title}</option>
                  ))}
                </select>
              )}

              <label className="label">Submitted Date</label>
              <input type="date" value={searchDate} onChange={e => setSearchDate(e.target.value)} className="input" />

              <label className="label">Applicant Email</label>
              <input value={searchEmail} onChange={e => setSearchEmail(e.target.value)} className="input" />

              <label className="label">Applicant Phone</label>
              <input value={searchPhone} onChange={e => setSearchPhone(e.target.value)} className="input" />
            </div>

            <div className="modal-actions">
              <button className="btn btn-muted" onClick={() => setShowSearch(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => {
                // Build params
                const params: Record<string,string> = {}
                if (searchJobTitle) params.job_title = searchJobTitle
                if (searchEmail) params.email = searchEmail
                if (searchPhone) params.phone = searchPhone
                if (searchDate) params.submitted_date = searchDate
                // fetch first page with params
                await fetchApplications(1, params)
                setPage(1)
                setShowSearch(false)
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
                  <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />
                </svg>
                Search
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

