'use client'

import WebsiteSectionShell from '@/features/websites/WebsiteSectionShell'

export default function WebsitesWorkspace() {
  return (
    <WebsiteSectionShell
      sectionLabel="Websites"
      sectionTitle="Website workspace"
      sectionPath="/admin"
    >
      {({ selectedWebsite }) => (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Selected website
          </p>
          <h3 className="mt-2 text-xl font-bold">{selectedWebsite.name}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {selectedWebsite.primaryDomain}
          </p>
        </div>
      )}
    </WebsiteSectionShell>
  )
}
