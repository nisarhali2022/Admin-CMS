'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import AdminLoginForm from './AdminLoginForm'
import WebsitesWorkspace from '@/features/websites/WebsitesWorkspace'

const navItems = [
  { href: '/admin', label: 'Websites', scoped: true },
  { href: '/admin/media', label: 'Media', scoped: true },
  { href: '/admin/content', label: 'Pages', scoped: true },
  { href: '/admin/posts', label: 'Posts', scoped: true },
  { href: '/admin/categories', label: 'Categories', scoped: true },
  { href: '/admin/authors', label: 'Authors', scoped: true },
  { href: '/admin/redirects', label: 'Redirects', scoped: true },
  { href: '/admin/settings', label: 'Settings', scoped: true },
  { href: '/admin/import', label: 'Import', scoped: true },
  { href: '/admin/quiz', label: 'Quiz', scoped: false },
]

export default function AdminShell({ authenticated, children }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const websiteId = searchParams.get('websiteId')
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/admin/session', { method: 'DELETE' })
    router.refresh()
  }

  function getNavHref(item) {
    if (!item.scoped || !websiteId) return item.href
    return `${item.href}?websiteId=${websiteId}`
  }

  function isActive(item) {
    return pathname === item.href
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[96rem] items-center justify-between px-6 py-4">
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

      <main className="mx-auto grid max-w-[96rem] gap-6 px-6 py-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4">
          <nav aria-label="Admin sections" className="space-y-1 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={getNavHref(item)}
                className={`block rounded-md px-3 py-2 font-semibold transition ${
                  isActive(item)
                    ? 'bg-slate-950 text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          {authenticated ? (
            children || <WebsitesWorkspace />
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
