'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  FolderOpen,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Newspaper,
  PlayCircle,
  Settings,
  Shuffle,
  Tag,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import AdminLoginForm from './AdminLoginForm'
import DashboardWorkspace from '@/features/dashboard/DashboardWorkspace'

const navItems = [
  { href: '/admin', label: 'Dashboard', scoped: true, icon: LayoutDashboard, group: '' },
  { href: '/admin/media', label: 'Media', scoped: true, icon: FolderOpen, group: 'Content' },
  { href: '/admin/content', label: 'Pages', scoped: true, icon: LayoutTemplate, group: 'Content' },
  { href: '/admin/posts', label: 'Posts', scoped: true, icon: Newspaper, group: 'Content' },
  { href: '/admin/categories', label: 'Categories', scoped: true, icon: Tag, group: 'Blog' },
  { href: '/admin/authors', label: 'Authors', scoped: true, icon: Users, group: 'Blog' },
  { href: '/admin/redirects', label: 'Redirects', scoped: true, icon: Shuffle, group: 'Site' },
  { href: '/admin/settings', label: 'Settings', scoped: true, icon: Settings, group: 'Site' },
]

export default function AdminShell({ authenticated, children }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const websiteId = searchParams.get('websiteId')
  const [loggingOut, setLoggingOut] = useState(false)
  const [websites, setWebsites] = useState([])
  const [websiteMessage, setWebsiteMessage] = useState('')

  async function loadHeaderWebsites(active = () => true) {
    fetch('/api/cms/websites', { cache: 'no-store' })
      .then((response) => response.json().then((body) => ({ response, body })))
      .then(({ response, body }) => {
        if (!active()) return
        if (!response.ok) {
          setWebsiteMessage(body?.error || 'Unable to load websites.')
          return
        }
        setWebsiteMessage('')
        setWebsites(body.websites || [])
      })
      .catch(() => {
        if (active()) setWebsiteMessage('Unable to load websites.')
      })
  }

  useEffect(() => {
    if (!authenticated) return

    let active = true
    const isActive = () => active
    const handleWebsitesUpdated = () => {
      loadHeaderWebsites(isActive)
    }

    loadHeaderWebsites(isActive)
    window.addEventListener('cms:websites-updated', handleWebsitesUpdated)

    return () => {
      active = false
      window.removeEventListener('cms:websites-updated', handleWebsitesUpdated)
    }
  }, [authenticated])

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

  const isQuizRoute = pathname === '/admin/quiz'
  const hideSidebar = isQuizRoute
  const activeItem = navItems.find((item) => isActive(item))
  const selectedWebsite = useMemo(
    () => websites.find((website) => website.id === websiteId) || null,
    [websiteId, websites],
  )
  const pageTitle = isQuizRoute
    ? 'Quiz Update'
    : activeItem?.label || 'Dashboard'
  const activeTitle = isQuizRoute
    ? pageTitle
    : selectedWebsite
      ? selectedWebsite.name
      : pageTitle
  const groupedNav = navItems.reduce((groups, item) => {
    if (!groups[item.group]) groups[item.group] = []
    groups[item.group].push(item)
    return groups
  }, {})

  return (
    <div className="wp-admin-interface min-h-screen bg-[#f4f5f7] text-[#1f2330]">
      {!authenticated ? (
        <main className="flex min-h-screen items-center justify-center bg-surface px-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-white p-8 shadow-lg">
            <div className="mb-6 text-center">
              <h1 className="font-heading text-xl font-bold text-text-primary">
                Quiz Admin
              </h1>
              <p className="mt-1 text-text-secondary">
                Enter your admin secret to continue
              </p>
            </div>
            <AdminLoginForm />
          </div>
        </main>
      ) : (
        <>
        {!hideSidebar ? (
        <aside className="border-b border-[#e5e7eb] bg-white text-[#1f2330] lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-60 lg:border-b-0 lg:border-r">
          <div className="flex h-14 items-center gap-2 border-b border-[#edf0f3] px-5 text-[#111827]">
            <BookOpen className="h-4 w-4 text-[#673de6]" />
            <div className="min-w-0">
              <p className="truncate text-[0.95rem] font-bold leading-none">Telenor CMS</p>
              <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
                Admin
              </p>
            </div>
          </div>

          <nav aria-label="Admin sections" className="max-h-[calc(100vh-3.5rem)] overflow-y-auto px-3 py-4 text-[0.95rem]">
            {Object.entries(groupedNav).map(([group, items], groupIndex) => (
              <div key={group}>
                {groupIndex > 0 ? <Separator className="my-3 bg-[#edf0f3]" /> : null}
                {group ? (
                  <p className="px-3 py-1.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[#8b95a1]">
                    {group}
                  </p>
                ) : null}
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item)

                    return (
                      <Link
                        key={item.href}
                        href={getNavHref(item)}
                        className={`flex min-h-10 items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition ${
                          active
                            ? 'bg-[#f0ecff] text-[#2f1c6a]'
                            : 'text-[#374151] hover:bg-[#f5f3ff] hover:text-[#2f1c6a]'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-current" />
                        <span className="truncate">{item.label}</span>
                        {!item.scoped ? (
                          <span className="ml-auto rounded-full bg-[#ebe4ff] px-2 py-0.5 text-[0.68rem] uppercase text-[#673de6]">
                            Global
                          </span>
                        ) : null}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>
        ) : null}

      <div className={hideSidebar ? '' : 'lg:pl-60'}>
        <header className="sticky top-0 z-30 border-b border-[#e5e7eb] bg-white">
          <div className="grid min-h-14 grid-cols-1 items-center gap-3 px-4 py-3 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,30rem)_minmax(0,1fr)]">
            <div className="min-w-0 justify-self-start">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[1.08rem] font-bold leading-tight text-[#1f2330]">
                  {activeTitle}
                </h1>
                {isQuizRoute ? (
                  <Badge className="rounded-full bg-[#2f1c6a] px-2.5 text-white">Global</Badge>
                ) : null}
              </div>
            </div>
            <div className="w-full justify-self-center">
              <select
                value={websiteId || ''}
                onChange={(event) => {
                  if (event.target.value) {
                    router.push(`/admin?websiteId=${event.target.value}`)
                  }
                }}
                className="h-10 w-full min-w-0 rounded-full border border-[#d8dae0] bg-white px-4 text-[0.95rem] font-semibold text-[#1f2330] shadow-sm outline-none focus:border-[#673de6] focus:ring-4 focus:ring-[#ebe4ff]"
                aria-label="Select website"
              >
                <option value="">
                  {websiteMessage || 'Select website'}
                </option>
                {websites.map((website) => (
                  <option key={website.id} value={website.id}>
                    {website.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
              <Button
                asChild
                variant="outline"
                size="sm"
                className={`rounded-full border-[#d8dae0] px-3.5 ${
                  isQuizRoute
                    ? 'bg-[#673de6] text-white hover:bg-[#5025d1]'
                    : 'bg-white text-[#1f2330] hover:bg-[#f5f3ff]'
                }`}
              >
                <Link href="/admin/quiz">
                  <PlayCircle />
                  Quiz
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-full border-[#d8dae0] bg-white px-3.5 text-[#1f2330] hover:bg-[#f5f3ff]"
              >
                <LogOut />
                {loggingOut ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6">
          <section className="mx-auto min-w-0 max-w-[104rem]">
          {children || (
            <DashboardWorkspace
              websiteId={websiteId}
              selectedWebsite={selectedWebsite}
            />
          )}
          </section>
        </main>
      </div>
      </>
      )}
    </div>
  )
}
