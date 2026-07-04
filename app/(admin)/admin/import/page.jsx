import AdminShell from '@/features/admin-shell/AdminShell'
import ImportWorkspace from '@/features/import/ImportWorkspace'
import { hasAdminSession } from '@/lib/adminAuth'
import { validateAdminEnv } from '@/lib/env/adminEnv'

export const metadata = {
  title: 'Import - Admin CMS',
}

export default async function ImportAdminPage() {
  validateAdminEnv()
  const authenticated = await hasAdminSession()

  return (
    <AdminShell authenticated={authenticated}>
      <ImportWorkspace />
    </AdminShell>
  )
}
