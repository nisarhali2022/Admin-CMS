'use client'

import RedirectsManager from '@/features/redirects/RedirectsManager'
import WebsiteContextShell from '@/features/websites/WebsiteContextShell'

export default function RedirectsWorkspace() {
  return (
    <WebsiteContextShell>
      {({ selectedWebsite }) => (
        <RedirectsManager websiteId={selectedWebsite.id} />
      )}
    </WebsiteContextShell>
  )
}
