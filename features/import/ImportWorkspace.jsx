'use client'

import ImportManager from '@/features/import/ImportManager'
import WebsiteSectionShell from '@/features/websites/WebsiteSectionShell'

export default function ImportWorkspace() {
  return (
    <WebsiteSectionShell
      sectionLabel="Migration"
      sectionTitle="WordPress import"
      sectionPath="/admin/import"
    >
      {({ selectedWebsite }) => <ImportManager website={selectedWebsite} />}
    </WebsiteSectionShell>
  )
}
