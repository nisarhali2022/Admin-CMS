import AdminShell from '@/features/admin-shell/AdminShell'
import MediaWorkspace from '@/features/media/MediaWorkspace'
import { hasAdminSession } from 'cms-core/adminAuth'
import { validateAdminEnv } from 'cms-core/env/adminEnv'

export const metadata = {
  title: 'Media - Admin CMS',
}

export default async function MediaAdminPage() {
  validateAdminEnv()
  const authenticated = await hasAdminSession()

  return (
    <AdminShell authenticated={authenticated}>
      <MediaWorkspace />
    </AdminShell>
  )
}
