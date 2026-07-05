'use client'

import TemplateContentManager from '@/features/template-content/TemplateContentManager'
import WebsiteContextShell from '@/features/websites/WebsiteContextShell'

export default function TemplateContentWorkspace() {
  return (
    <WebsiteContextShell>
      {({ selectedWebsite }) => (
        <TemplateContentManager websiteId={selectedWebsite.id} />
      )}
    </WebsiteContextShell>
  )
}
