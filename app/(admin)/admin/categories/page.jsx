import AdminShell from '@/features/admin-shell/AdminShell'
import CategoriesWorkspace from '@/features/categories/CategoriesWorkspace'
import { hasAdminSession } from '@/lib/adminAuth'
import { validateAdminEnv } from '@/lib/env/adminEnv'

export const metadata = {
  title: 'Categories - Admin CMS',
}

export default async function CategoriesAdminPage() {
  validateAdminEnv()
  const authenticated = await hasAdminSession()

  return (
    <AdminShell authenticated={authenticated}>
      <CategoriesWorkspace />
    </AdminShell>
  )
}
