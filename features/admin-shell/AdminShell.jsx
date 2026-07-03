'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import AdminLoginForm from './AdminLoginForm'
import WebsitesWorkspace from '@/features/websites/WebsitesWorkspace'

export default function AdminShell({ authenticated }) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/admin/session', { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Admin CMS
            </p>
            <h1 className="text-xl font-bold">Telenor content manager</h1>
          </div>
          {authenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingOut ? 'Signing out...' : 'Sign out'}
            </button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[18rem_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4">
          <nav aria-label="Admin sections" className="space-y-1 text-sm">
            <div className="rounded-md bg-slate-950 px-3 py-2 font-semibold text-white">
              Websites
            </div>
            <div className="px-3 py-2 text-slate-500">Quiz</div>
            <div className="px-3 py-2 text-slate-500">Media</div>
            <div className="px-3 py-2 text-slate-500">Content</div>
            <div className="px-3 py-2 text-slate-500">Settings</div>
          </nav>
        </aside>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          {authenticated ? (
            <WebsitesWorkspace />
          ) : (
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Private admin
              </p>
              <h2 className="mt-2 text-2xl font-bold">Sign in</h2>
              <p className="mt-3 max-w-xl leading-7 text-slate-600">
                Enter the configured admin secret to open the CMS workspace.
              </p>
              <AdminLoginForm />
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
