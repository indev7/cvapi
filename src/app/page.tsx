import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect the root path to the admin UI
  redirect('/admin')
}