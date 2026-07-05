'use client'

import WebsiteContextShell from '@/features/websites/WebsiteContextShell'
import MediaLibrary from '@/features/media/MediaLibrary'

export default function MediaWorkspace() {
  return (
    <WebsiteContextShell>
      {({ selectedWebsite }) => <MediaLibrary websiteId={selectedWebsite.id} />}
    </WebsiteContextShell>
  )
}
