import AdminShell from '@/features/admin-shell/AdminShell'
import QuizManager from '@/features/quiz/QuizManager'
import { hasAdminSession } from '@/lib/adminAuth'
import { validateAdminEnv } from '@/lib/env/adminEnv'

export const metadata = {
  title: 'Quiz - Admin CMS',
}

export default async function QuizAdminPage() {
  validateAdminEnv()
  const authenticated = await hasAdminSession()

  return (
    <AdminShell authenticated={authenticated}>
      <QuizManager />
    </AdminShell>
  )
}
