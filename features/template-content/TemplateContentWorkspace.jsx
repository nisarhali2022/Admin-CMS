'use client'

import TemplateContentManager from '@/features/template-content/TemplateContentManager'
import WebsiteSectionShell from '@/features/websites/WebsiteSectionShell'

export default function TemplateContentWorkspace() {
  return (
    <WebsiteSectionShell
      sectionLabel="Pages"
      sectionTitle="Template content"
      sectionPath="/admin/content"
    >
      {({ selectedWebsite }) => (
        <TemplateContentManager websiteId={selectedWebsite.id} />
      )}
    </WebsiteSectionShell>
  )
}
