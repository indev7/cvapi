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

  if (loading) return <div className="p-6">Loading vacancies...</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vacancies ({vacancies.length})</h1>
        <button onClick={fetchVacancies} className="btn btn-primary">Refresh</button>
      </div>

      {vacancies.length === 0 ? (
        <div className="card p-6">No vacancies found</div>
      ) : (
        <div className="overflow-x-auto card p-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applications</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vacancies.map(v => (
                <tr key={v.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{v.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{v.job_title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{v.status}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{v.applicationCount ?? '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{v.pendingCount ?? '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{v.created_at ? new Date(v.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
