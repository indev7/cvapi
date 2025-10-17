"use client"

import { useEffect, useState } from 'react'

interface Vacancy {
  id: number
  job_title: string
  url?: string | null
  status: string
  closing_date?: string | null
  applicationCount?: number
  pendingCount?: number
  created_at?: string
}

export default function AdminVacanciesPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formJobTitle, setFormJobTitle] = useState<string>('')
  const [formUrl, setFormUrl] = useState<string>('')
  const [formClosingDate, setFormClosingDate] = useState<string>('')
  // description removed from model
  const [formStatus, setFormStatus] = useState<string>('active')
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  useEffect(() => {
    fetchVacancies()
  }, [])

  const fetchVacancies = async () => {
    try {
      setLoading(true)
      const proxyRes = await fetch('/api/internal/proxy', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/api/vacancies', method: 'GET' })
      })
      const data = await proxyRes.json()
      if (!proxyRes.ok) {
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
          <button onClick={() => {
            // Open modal for creating new vacancy
            setEditingId(null)
            setFormJobTitle('')
            setFormUrl('')
            setFormStatus('active')
            setModalError(null)
            setShowModal(true)
          }} className="btn btn-primary" style={{ marginRight: 8 }}>+ Vacancies</button>
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
                    <tr key={v.id} onClick={() => {
                      // Open modal pre-filled for editing this vacancy
                        setEditingId(v.id)
                        setFormJobTitle(v.job_title)
                        setFormUrl(v.url || '')
                        // prefill closing date if available (format YYYY-MM-DD)
                        if (v.closing_date) {
                          setFormClosingDate(new Date(v.closing_date).toISOString().slice(0,10))
                        } else if (v.created_at) {
                          // fallback to computed closing date (created_at + 30 days) to match table display
                          try {
                            const d = new Date(v.created_at)
                            d.setDate(d.getDate() + 30)
                            setFormClosingDate(d.toISOString().slice(0,10))
                          } catch (e) {
                            setFormClosingDate('')
                          }
                        } else {
                          setFormClosingDate('')
                        }
                        setFormStatus(v.status || 'active')
                      setModalError(null)
                      setShowModal(true)
                    }} style={{ cursor: 'pointer' }}>
                      <td>{v.job_title}</td>
                      <td>{v.url ? (<a href={v.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{v.url}</a>) : '\u2014'}</td>
                      <td>{v.applicationCount ?? '\u2014'}</td>
                      <td>{v.closing_date ? new Date(v.closing_date).toLocaleDateString() : closing}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Create / Edit Vacancy Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2 className="modal-title">{editingId ? 'Edit Vacancy' : 'Create Vacancy'}</h2>
            <div className="modal-body">
              {modalError && <div className="admin-error">{modalError}</div>}

              <label className="label">Job Title</label>
              <input className="input" value={formJobTitle} onChange={e => setFormJobTitle(e.target.value)} />

              <label className="label">JD URL</label>
              <input className="input" value={formUrl} onChange={e => setFormUrl(e.target.value)} />

              <label className="label">Closing Date</label>
              <input type="date" className="input" value={formClosingDate} onChange={e => setFormClosingDate(e.target.value)} />

              <label className="label">Status</label>
              <select className="input" value={formStatus} onChange={e => setFormStatus(e.target.value)}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn btn-muted" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => {
                // simple client-side validation
                if (!formJobTitle || formJobTitle.trim().length === 0) {
                  setModalError('Job title is required')
                  return
                }
                setSaving(true)
                setModalError(null)
                try {
                  const payload = {
                    job_title: formJobTitle.trim(),
                    url: formUrl && formUrl.trim() !== '' ? formUrl.trim() : undefined,
                    closing_date: formClosingDate && formClosingDate.trim() !== '' ? formClosingDate : undefined,
                    status: (formStatus === 'active' || formStatus === 'inactive') ? formStatus : 'active'
                  }

                  let res
                  if (editingId) {
                    res = await fetch('/api/vacancies', {
                      method: 'PUT',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: editingId, ...payload })
                    })
                  } else {
                    res = await fetch('/api/vacancies', {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                    })
                  }

                  const data = await res.json()
                  if (!res.ok) {
                    setModalError(data.error || 'Failed to save vacancy')
                    return
                  }

                  // success: refresh list and close modal
                  await fetchVacancies()
                  setShowModal(false)
                } catch (err: any) {
                  console.error('Save vacancy failed', err)
                  setModalError(err?.message || 'Failed to save')
                } finally {
                  setSaving(false)
                }
              }} disabled={saving}>{saving ? 'Saving…' : (editingId ? 'Update' : 'Create')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
