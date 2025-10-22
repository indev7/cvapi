"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface RankingRow {
  id: number
  application_id: string
  total_score: number
  final_score: number
  ranked_at: string
  application: {
    id: string
    job_title: string
    email?: string | null
    phone?: string | null
  }
}

export default function AdminRankingsPage() {
  const [rows, setRows] = useState<RankingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const perPage = 100
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchRankings(page)
  }, [page])

  const fetchRankings = async (pageNumber = 1) => {
    try {
      setLoading(true)
      const proxyRes = await fetch(`/api/internal/proxy`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `/api/admin/rankings?page=${pageNumber}&limit=${perPage}`, method: 'GET' })
      })
      const data = await proxyRes.json()
      if (!proxyRes.ok) {
        setError(data.error || 'Failed to load rankings')
        return
      }
      setRows(data.rankings || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-6">Loading rankings...</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Rankings ({rows.length})</h1>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-600">Page {page} / {totalPages}</div>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-muted">Prev</button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="btn btn-muted">Next</button>
        </div>
      </div>

      <div className="card p-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ranking ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Application ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Final Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ranked At</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map(r => (
              <tr key={r.id} className="bg-white">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.application_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {r.application?.job_title ? (
                    <Link href={`/admin/applications?job_title=${encodeURIComponent(r.application.job_title)}`} className="text-indigo-600 underline">
                      {r.application.job_title}
                    </Link>
                  ) : '\u2014'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.total_score}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.final_score}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(r.ranked_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
