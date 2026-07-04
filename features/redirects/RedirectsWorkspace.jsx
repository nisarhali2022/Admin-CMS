'use client'

import RedirectsManager from '@/features/redirects/RedirectsManager'
import WebsiteSectionShell from '@/features/websites/WebsiteSectionShell'

export default function RedirectsWorkspace() {
  return (
    <WebsiteSectionShell
      sectionLabel="SEO"
      sectionTitle="Redirects"
      sectionPath="/admin/redirects"
    >
      {({ selectedWebsite }) => (
        <RedirectsManager websiteId={selectedWebsite.id} />
      )}
    </WebsiteSectionShell>
  )
}
