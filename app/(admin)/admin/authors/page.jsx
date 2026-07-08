import AdminShell from '@/features/admin-shell/AdminShell'
import AuthorsWorkspace from '@/features/authors/AuthorsWorkspace'
import { hasAdminSession } from 'cms-core/adminAuth'
import { validateAdminEnv } from 'cms-core/env/adminEnv'

export const metadata = {
  title: 'Authors - Admin CMS',
}

export default async function AuthorsAdminPage() {
  validateAdminEnv()
  const authenticated = await hasAdminSession()

  return (
    <AdminShell authenticated={authenticated}>
      <AuthorsWorkspace />
    </AdminShell>
  )
}
