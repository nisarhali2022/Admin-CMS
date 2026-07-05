import AdminShell from '@/features/admin-shell/AdminShell'
import WebsitesWorkspace from '@/features/websites/WebsitesWorkspace'
import { hasAdminSession } from '@/lib/adminAuth'
import { validateAdminEnv } from '@/lib/env/adminEnv'

export const metadata = {
  title: 'Add Website - Admin CMS',
}

export default async function AddWebsitePage() {
  validateAdminEnv()
  const authenticated = await hasAdminSession()

  return (
    <AdminShell authenticated={authenticated}>
      <WebsitesWorkspace />
    </AdminShell>
  )
}
