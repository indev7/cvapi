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
            <Link href="/admin/applications" className="admin-nav-link">Applications</Link>
            <Link href="/admin/vacancies" className="admin-nav-link">Vacancies</Link>
          </nav>
        </aside>

        <main className="admin-main">
          {children}
        </main>
      </div>
    </div>
  )
}