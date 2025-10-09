import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="admin-root">
      <div className="admin-layout-flex">
        <aside className="admin-sidebar">
          <div className="mb-6">
            <h2 className="text-lg font-bold">Admin</h2>
            <div className="text-sm muted">CV Submission</div>
          </div>
          <nav>
            <Link href="/admin" className="admin-nav-link">Dashboard</Link>
            <Link href="/admin/blobs" className="admin-nav-link">CV Files</Link>
            <Link href="/admin/applications" className="admin-nav-link">Applications</Link>
            <Link href="/admin/vacancies" className="admin-nav-link">Vacancies</Link>
            <Link href="/admin/rankings" className="admin-nav-link">Rankings</Link>
            <Link href="/admin/login" className="admin-nav-link">Logout</Link>
          </nav>
        </aside>

        <main className="admin-main">
          {children}
        </main>
      </div>
    </div>
  )
}