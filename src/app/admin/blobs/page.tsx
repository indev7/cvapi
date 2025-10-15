'use client'

import { useState, useEffect } from 'react'

interface Blob {
  url: string
  pathname: string
  size: number
  uploadedAt: string
  applicationId: string | null
}

export default function AdminBlobsPage() {
  const [blobs, setBlobs] = useState<Blob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBlobs()
  }, [])

  const fetchBlobs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/blobs')
      const data = await response.json()
      
      if (response.ok) {
        setBlobs(data.blobs)
      } else {
        setError(data.error || 'Failed to fetch blobs')
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

  const deleteBlob = async (url: string, pathname: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${pathname}"?\n\nThis action cannot be undone and will also remove the file reference from the associated application.`
    )

    if (!confirmDelete) return

    try {
      const response = await fetch(`/api/admin/blobs?url=${encodeURIComponent(url)}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        // Remove the deleted blob from local state
        setBlobs(prev => prev.filter(blob => blob.url !== url))
        alert('File deleted successfully!')
      } else {
        alert(`Failed to delete file: ${data.error}`)
      }
    } catch (err) {
      alert('Network error while deleting file')
    }
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Blob Storage Browser</h1>
        <button
          onClick={fetchBlobs}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-xl font-semibold">CV Files ({blobs.length})</h2>
        </div>

        {blobs.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No files found in blob storage
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Application ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {blobs.map((blob, index) => (
                  <tr key={blob.url} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {blob.pathname}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {blob.applicationId || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatFileSize(blob.size)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(blob.uploadedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <a
                        href={blob.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View
                      </a>
                      <a
                        href={blob.url}
                        download
                        className="text-green-600 hover:text-green-900 mr-4"
                      >
                        Download
                      </a>
                      <button
                        onClick={() => deleteBlob(blob.url, blob.pathname)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete file permanently"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 text-sm text-gray-600">
        <p>💡 Tips:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Files are named with application UUIDs (e.g., uuid.pdf)</li>
          <li>Click &quot;View&quot; to open the CV in a new tab</li>
          <li>Click &quot;Download&quot; to save the file locally</li>
          <li>Click &quot;Delete&quot; to permanently remove the file (confirmation required)</li>
          <li>Files with Application ID can be traced back to database records</li>
          <li>⚠️ Deleting a file will also remove its reference from the application record</li>
        </ul>
      </div>
    </div>
  )
}