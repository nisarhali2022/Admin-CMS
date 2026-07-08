import AdminShell from '@/features/admin-shell/AdminShell'
import PostsWorkspace from '@/features/posts/PostsWorkspace'
import { hasAdminSession } from 'cms-core/adminAuth'
import { validateAdminEnv } from 'cms-core/env/adminEnv'

export const metadata = {
  title: 'Posts - Admin CMS',
}

export default async function PostsAdminPage() {
  validateAdminEnv()
  const authenticated = await hasAdminSession()

  return (
    <AdminShell authenticated={authenticated}>
      <PostsWorkspace />
    </AdminShell>
  )
}
