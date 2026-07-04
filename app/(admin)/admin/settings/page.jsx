import AdminShell from '@/features/admin-shell/AdminShell'
import SettingsWorkspace from '@/features/settings/SettingsWorkspace'
import { hasAdminSession } from '@/lib/adminAuth'
import { validateAdminEnv } from '@/lib/env/adminEnv'

export const metadata = {
  title: 'Settings - Admin CMS',
}

export default async function SettingsAdminPage() {
  validateAdminEnv()
  const authenticated = await hasAdminSession()

  return (
    <AdminShell authenticated={authenticated}>
      <SettingsWorkspace />
    </AdminShell>
  )
}
