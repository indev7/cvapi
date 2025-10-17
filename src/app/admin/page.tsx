"use client"

// Keep the dashboard UI available at /admin/dashboard. The root /admin path should show the login page.
import AdminLoginPage from './login/page'

export default function AdminRoot() {
  // Render the login page directly at /admin so the dashboard is hidden from default flow.
  return <AdminLoginPage />
}