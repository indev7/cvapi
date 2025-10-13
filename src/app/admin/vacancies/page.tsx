"use client"

import { useEffect, useState } from 'react'

interface Vacancy {
  id: number
  job_title: string
  url?: string | null
  description?: string | null
  status: string
  applicationCount?: number
  pendingCount?: number
  created_at?: string
}

export default function AdminVacanciesPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchVacancies()
  }, [])

  const fetchVacancies = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/vacancies', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to load vacancies')
        return
      }
      setVacancies(data || data.vacancies || [])
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-container">
      <div className="admin-row" style={{ marginBottom: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="page-title">Vacancies ({vacancies.length})</h1>
        <div className="admin-actions">
          <button onClick={fetchVacancies} className="btn btn-primary">Refresh</button>
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="muted">Loading vacancies...</div>
        ) : error ? (
          <div className="admin-error">Error: {error}</div>
        ) : vacancies.length === 0 ? (
          <div className="muted">No vacancies found</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>JD</th>
                  <th>Number of Applications</th>
                  <th>Closing Date</th>
                </tr>
              </thead>
              <tbody>
                {vacancies.map(v => {
                  let closing = '—'
                  if (v.created_at) {
                    try {
                      const d = new Date(v.created_at)
                      d.setDate(d.getDate() + 30)
                      closing = d.toLocaleDateString()
                    } catch (e) {
                      closing = '—'
                    }
                  }

                  return (
                    <tr key={v.id}>
                      <td>{v.job_title}</td>
                      <td>{v.url ? (<a href={v.url} target="_blank" rel="noreferrer">{v.url}</a>) : (v.description || '\u2014')}</td>
                      <td>{v.applicationCount ?? '\u2014'}</td>
                      <td>{closing}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
