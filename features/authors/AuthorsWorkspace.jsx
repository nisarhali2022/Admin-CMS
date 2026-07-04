'use client'

import AuthorsManager from '@/features/authors/AuthorsManager'
import WebsiteSectionShell from '@/features/websites/WebsiteSectionShell'

export default function AuthorsWorkspace() {
  return (
    <WebsiteSectionShell
      sectionLabel="Blog"
      sectionTitle="Authors"
      sectionPath="/admin/authors"
    >
      {({ selectedWebsite }) => <AuthorsManager websiteId={selectedWebsite.id} />}
    </WebsiteSectionShell>
  )
}
