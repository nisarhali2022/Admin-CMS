import AdminShell from '@/features/admin-shell/AdminShell'
import { hasAdminSession } from 'cms-core/adminAuth'
import { validateAdminEnv } from 'cms-core/env/adminEnv'

export const metadata = {
  title: 'Admin CMS',
}

export default async function AdminPage() {
  validateAdminEnv()
  const authenticated = await hasAdminSession()

  return <AdminShell authenticated={authenticated} />
}
