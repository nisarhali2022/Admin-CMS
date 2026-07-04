'use client'

import SettingsManager from '@/features/settings/SettingsManager'
import WebsiteSectionShell from '@/features/websites/WebsiteSectionShell'

export default function SettingsWorkspace() {
  return (
    <WebsiteSectionShell
      sectionLabel="Website"
      sectionTitle="Settings"
      sectionPath="/admin/settings"
    >
      {({ selectedWebsite }) => (
        <SettingsManager websiteId={selectedWebsite.id} />
      )}
    </WebsiteSectionShell>
  )
}
