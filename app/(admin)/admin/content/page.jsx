import AdminShell from '@/features/admin-shell/AdminShell'
import TemplateContentWorkspace from '@/features/template-content/TemplateContentWorkspace'
import { hasAdminSession } from '@/lib/adminAuth'
import { validateAdminEnv } from '@/lib/env/adminEnv'

export const metadata = {
  title: 'Content - Admin CMS',
}

export default async function ContentAdminPage() {
  validateAdminEnv()
  const authenticated = await hasAdminSession()

  return (
    <AdminShell authenticated={authenticated}>
      <TemplateContentWorkspace />
    </AdminShell>
  )
}
