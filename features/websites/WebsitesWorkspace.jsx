'use client'

import { Globe2 } from 'lucide-react'
import { AdminPanel, StatusBadge } from '@/components/admin/admin-ui'
import ImportManager from '@/features/import/ImportManager'
import WebsiteSectionShell from '@/features/websites/WebsiteSectionShell'

export default function WebsitesWorkspace() {
  return (
    <WebsiteSectionShell
      sectionLabel="Websites"
      sectionTitle="Website workspace"
      sectionPath="/admin/add-website"
      afterCreatePath="/admin/add-website"
    >
      {({ selectedWebsite }) => (
        <div className="space-y-5">
          <AdminPanel
            title="Selected website"
            description="Use the navigation to manage this website's media, pages, posts, authors, SEO settings, redirects, and import workflow."
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Globe2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-xl font-semibold">
                    {selectedWebsite.name}
                  </h3>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {selectedWebsite.primaryDomain}
                  </p>
                </div>
              </div>
              <StatusBadge active={selectedWebsite.isActive} />
            </div>
          </AdminPanel>

          <ImportManager website={selectedWebsite} />
        </div>
      )}
    </WebsiteSectionShell>
  )
}
