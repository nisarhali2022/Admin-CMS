'use client'

import CategoriesManager from '@/features/categories/CategoriesManager'
import WebsiteSectionShell from '@/features/websites/WebsiteSectionShell'

export default function CategoriesWorkspace() {
  return (
    <WebsiteSectionShell
      sectionLabel="Blog"
      sectionTitle="Categories"
      sectionPath="/admin/categories"
    >
      {({ selectedWebsite }) => (
        <CategoriesManager websiteId={selectedWebsite.id} />
      )}
    </WebsiteSectionShell>
  )
}
