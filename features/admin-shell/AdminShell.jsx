'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  FolderOpen,
  Globe2,
  Import,
  LayoutTemplate,
  LogOut,
  Newspaper,
  PlayCircle,
  Plus,
  Settings,
  Shuffle,
  Tag,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import AdminLoginForm from './AdminLoginForm'
import WebsitesWorkspace from '@/features/websites/WebsitesWorkspace'

const navItems = [
  { href: '/admin', label: 'Websites', scoped: true, icon: Globe2, group: 'Workspace' },
  { href: '/admin/media', label: 'Media', scoped: true, icon: FolderOpen, group: 'Content' },
  { href: '/admin/content', label: 'Pages', scoped: true, icon: LayoutTemplate, group: 'Content' },
  { href: '/admin/posts', label: 'Posts', scoped: true, icon: Newspaper, group: 'Content' },
  { href: '/admin/categories', label: 'Categories', scoped: true, icon: Tag, group: 'Blog' },
  { href: '/admin/authors', label: 'Authors', scoped: true, icon: Users, group: 'Blog' },
  { href: '/admin/redirects', label: 'Redirects', scoped: true, icon: Shuffle, group: 'Site' },
  { href: '/admin/settings', label: 'Settings', scoped: true, icon: Settings, group: 'Site' },
  { href: '/admin/import', label: 'Import', scoped: true, icon: Import, group: 'Setup' },
]

export default function AdminShell({ authenticated, children }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const websiteId = searchParams.get('websiteId')
  const [loggingOut, setLoggingOut] = useState(false)
  const [websites, setWebsites] = useState([])
  const [websiteMessage, setWebsiteMessage] = useState('')

  useEffect(() => {
    if (!authenticated) return

    let active = true

    fetch('/api/cms/websites', { cache: 'no-store' })
      .then((response) => response.json().then((body) => ({ response, body })))
      .then(({ response, body }) => {
        if (!active) return
        if (!response.ok) {
          setWebsiteMessage(body?.error || 'Unable to load websites.')
          return
        }
        setWebsites(body.websites || [])
      })
      .catch(() => {
        if (active) setWebsiteMessage('Unable to load websites.')
      })

    return () => {
      active = false
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
  const activeItem = navItems.find((item) => isActive(item))
  const activeTitle = isQuizRoute ? 'Quiz' : activeItem?.label || 'Content manager'
  const selectedWebsite = useMemo(
    () => websites.find((website) => website.id === websiteId) || null,
    [websiteId, websites]
  )
  const groupedNav = navItems.reduce((groups, item) => {
    if (!groups[item.group]) groups[item.group] = []
    groups[item.group].push(item)
    return groups
  }, {})

  return (
    <div className="wp-admin-interface min-h-screen bg-[#f0f0f1] text-[#1d2327]">
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
        {!isQuizRoute ? (
        <aside className="border-b border-slate-800 bg-slate-950 text-slate-300 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-56 lg:border-b-0 lg:border-r">
          <div className="flex h-12 items-center gap-2 border-b border-white/10 px-4 text-white">
            <BookOpen className="h-4 w-4 text-sky-300" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-none">Telenor CMS</p>
              <p className="mt-1 text-[0.68rem] uppercase tracking-[0.12em] text-slate-400">
                Admin
              </p>
            </div>
          </div>

          <nav aria-label="Admin sections" className="max-h-[calc(100vh-3rem)] overflow-y-auto py-3 text-sm">
            {Object.entries(groupedNav).map(([group, items], groupIndex) => (
              <div key={group}>
                {groupIndex > 0 ? <Separator className="my-2 bg-white/10" /> : null}
                <p className="px-4 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {group}
                </p>
                <div className="space-y-0.5 px-2">
                  {items.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item)

                    return (
                      <Link
                        key={item.href}
                        href={getNavHref(item)}
                        className={`flex min-h-9 items-center gap-2 rounded-sm px-2.5 py-2 text-sm transition ${
                          active
                            ? 'bg-sky-700 text-white shadow-[inset_3px_0_0_rgba(255,255,255,0.85)]'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {!item.scoped ? (
                          <span className="ml-auto rounded-sm bg-white/10 px-1.5 py-0.5 text-[0.62rem] uppercase text-slate-200">
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

      <div className={isQuizRoute ? '' : 'lg:pl-56'}>
        <header className="sticky top-0 z-30 border-b border-[#c3c4c7] bg-white">
          <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[1.05rem] font-semibold leading-tight text-[#1d2327]">
                  {activeTitle}
                </h1>
                {websiteId && activeItem?.scoped ? (
                  <Badge variant="outline" className="max-w-48 truncate rounded-sm border-[#c3c4c7] bg-[#f6f7f7] text-[#50575e]">
                    Website selected
                  </Badge>
                ) : null}
                {isQuizRoute ? (
                  <Badge className="rounded-sm bg-slate-800 text-white">Global</Badge>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className={`rounded-sm border-[#c3c4c7] ${
                  isQuizRoute
                    ? 'bg-[#2271b1] text-white hover:bg-[#135e96]'
                    : 'bg-[#f6f7f7] text-[#1d2327] hover:bg-white'
                }`}
              >
                <Link href="/admin/quiz">
                  <PlayCircle />
                  Quiz
                </Link>
              </Button>
              <select
                value={websiteId || ''}
                onChange={(event) => {
                  if (event.target.value) {
                    router.push(`/admin?websiteId=${event.target.value}`)
                  }
                }}
                className="h-8 min-w-48 rounded-sm border-[#c3c4c7] bg-[#f6f7f7] px-2 text-sm"
                aria-label="Select website"
              >
                <option value="">
                  {websiteMessage || 'Select website'}
                </option>
                {websites.map((website) => (
                  <option key={website.id} value={website.id}>
                    {website.name}
                    {selectedWebsite?.id === website.id ? ' (selected)' : ''}
                  </option>
                ))}
              </select>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-sm border-[#c3c4c7] bg-[#f6f7f7] text-[#1d2327] hover:bg-white"
              >
                <Link href="/admin#add-website">
                  <Plus />
                  Add Website
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-sm border-[#c3c4c7] bg-[#f6f7f7] text-[#1d2327] hover:bg-white"
              >
                <LogOut />
                {loggingOut ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6">
          <section className="mx-auto min-w-0 max-w-[104rem]">
          {children || <WebsitesWorkspace />}
          </section>
        </main>
      </div>
      </>
      )}
    </div>
  )
}
