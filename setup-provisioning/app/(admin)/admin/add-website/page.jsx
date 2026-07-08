import AdminShell from '@/features/admin-shell/AdminShell'
import WebsitesWorkspace from '@/features/websites/WebsitesWorkspace'
import { hasAdminSession } from 'cms-core/adminAuth'
import { validateAdminEnv } from 'cms-core/env/adminEnv'

export const metadata = {
  title: 'Add Website - Admin CMS',
}

export const dynamic = 'force-dynamic'

export default async function AddWebsitePage() {
  validateAdminEnv()
  const authenticated = await hasAdminSession()

  return (
    <AdminShell authenticated={authenticated}>
      <WebsitesWorkspace />
    </AdminShell>
  )
}
