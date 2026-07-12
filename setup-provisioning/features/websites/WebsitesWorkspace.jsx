'use client'

import { useState } from 'react'
import { Globe2 } from 'lucide-react'
import { AdminPanel, StatusBadge } from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'
import ImportManager from '@/features/import/ImportManager'
import WebsiteSectionShell from '@/features/websites/WebsiteSectionShell'

export default function WebsitesWorkspace() {
  const [migratingMedia, setMigratingMedia] = useState(false)
  const [mediaMigrationReport, setMediaMigrationReport] = useState(null)

  async function migrateMediaFilenames(websiteId) {
    if (!window.confirm('Migrate existing media to readable WordPress-style filenames?')) return

    setMigratingMedia(true)
    setMediaMigrationReport(null)

    try {
      const response = await fetch(
        `/api/cms/media/migrate-filenames?websiteId=${websiteId}`,
        { method: 'POST' },
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMediaMigrationReport({ error: result.error || 'Unable to migrate media filenames.' })
        return
      }

      setMediaMigrationReport(result)
    } catch {
      setMediaMigrationReport({ error: 'Unable to reach the setup server.' })
    } finally {
      setMigratingMedia(false)
    }
  }

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

          <AdminPanel
            title="Media filenames"
            description="Convert existing UUID media URLs to readable WordPress-style filenames. Media IDs and content references stay unchanged."
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => migrateMediaFilenames(selectedWebsite.id)}
              disabled={migratingMedia}
            >
              {migratingMedia ? 'Migrating media...' : 'Migrate media filenames'}
            </Button>
            {mediaMigrationReport?.error ? (
              <p className="mt-3 text-sm text-destructive">{mediaMigrationReport.error}</p>
            ) : null}
            {mediaMigrationReport && !mediaMigrationReport.error ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Migrated {mediaMigrationReport.migrated} of {mediaMigrationReport.total};{' '}
                skipped {mediaMigrationReport.skipped}, failed {mediaMigrationReport.failed},
                renamed for collisions {mediaMigrationReport.collisionRenamed}.
              </p>
            ) : null}
          </AdminPanel>

          <ImportManager website={selectedWebsite} />
        </div>
      )}
    </WebsiteSectionShell>
  )
}
