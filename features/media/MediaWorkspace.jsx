'use client'

import WebsiteSectionShell from '@/features/websites/WebsiteSectionShell'
import MediaLibrary from '@/features/media/MediaLibrary'

export default function MediaWorkspace() {
  return (
    <WebsiteSectionShell
      sectionLabel="Media"
      sectionTitle="Media library"
      sectionPath="/admin/media"
    >
      {({ selectedWebsite }) => <MediaLibrary websiteId={selectedWebsite.id} />}
    </WebsiteSectionShell>
  )
}
