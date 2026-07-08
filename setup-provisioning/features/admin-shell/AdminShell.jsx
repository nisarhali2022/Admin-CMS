'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Database, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AdminLoginForm from './AdminLoginForm'

export default function AdminShell({ authenticated, children }) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/admin/session', { method: 'DELETE' })
    router.refresh()
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f5f7] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-[0_16px_40px_rgba(31,35,48,0.08)]">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ebe4ff] text-primary">
              <Database className="h-5 w-5" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-[#1f2330]">
              CMS Setup
            </h1>
            <p className="mt-1 text-sm text-[#6b7280]">
              Sign in to provision websites and import WordPress content.
            </p>
          </div>
          <AdminLoginForm />
        </div>
      </main>
    )
  }

  return (
    <div className="wp-admin-interface min-h-screen bg-[#f4f5f7]">
      <header className="sticky top-0 z-30 border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[#7c8490]">
              Setup
            </p>
            <h1 className="truncate text-[1.08rem] font-bold text-[#1f2330]">
              Website Workspace
            </h1>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut />
            {loggingOut ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
