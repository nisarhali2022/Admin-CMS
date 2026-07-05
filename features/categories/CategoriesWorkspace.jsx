'use client'

import CategoriesManager from '@/features/categories/CategoriesManager'
import WebsiteContextShell from '@/features/websites/WebsiteContextShell'

export default function CategoriesWorkspace() {
  return (
    <WebsiteContextShell>
      {({ selectedWebsite }) => (
        <CategoriesManager websiteId={selectedWebsite.id} />
      )}
    </WebsiteContextShell>
  )
}
