'use client'

import AuthorsManager from '@/features/authors/AuthorsManager'
import WebsiteContextShell from '@/features/websites/WebsiteContextShell'

export default function AuthorsWorkspace() {
  return (
    <WebsiteContextShell>
      {({ selectedWebsite }) => <AuthorsManager websiteId={selectedWebsite.id} />}
    </WebsiteContextShell>
  )
}
