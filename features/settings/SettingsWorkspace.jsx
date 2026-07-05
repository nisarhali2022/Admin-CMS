'use client'

import SettingsManager from '@/features/settings/SettingsManager'
import WebsiteContextShell from '@/features/websites/WebsiteContextShell'

export default function SettingsWorkspace() {
  return (
    <WebsiteContextShell>
      {({ selectedWebsite }) => (
        <SettingsManager websiteId={selectedWebsite.id} />
      )}
    </WebsiteContextShell>
  )
}
