"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SidebarLogout from './SidebarLogout'
import AdminAuthClient from './AdminAuthClient'
import SidebarNav from './SidebarNav'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const hideSidebar = pathname === '/admin' || pathname?.startsWith('/admin/login')
  return (
    <div className="admin-root">
      <div className="admin-layout-flex">
        {!hideSidebar && (
          <AdminAuthClient>
            <aside className="admin-sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
              <div>
                <SidebarNav />
              </div>

              <div style={{ marginTop: 'auto' }}>
                {/* SidebarLogout will hide itself when unauthenticated */}
                <SidebarLogout />
              </div>
            </aside>
          </AdminAuthClient>
        )}

        <main className="admin-main">
          {children}
        </main>
      </div>
    </div>
  )
}