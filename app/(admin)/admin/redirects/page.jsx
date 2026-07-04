import AdminShell from '@/features/admin-shell/AdminShell'
import RedirectsWorkspace from '@/features/redirects/RedirectsWorkspace'
import { hasAdminSession } from '@/lib/adminAuth'
import { validateAdminEnv } from '@/lib/env/adminEnv'

export const metadata = {
  title: 'Redirects - Admin CMS',
}

export default async function RedirectsAdminPage() {
  validateAdminEnv()
  const authenticated = await hasAdminSession()

  return (
    <AdminShell authenticated={authenticated}>
      <RedirectsWorkspace />
    </AdminShell>
  )
}
