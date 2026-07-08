'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Globe2, Plus, RefreshCw, Save } from 'lucide-react'
import {
  AdminPanel,
  EmptyState,
  Field,
  LoadingState,
  MessageAlert,
  PageHeader,
  StatusBadge,
} from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const emptyCreateForm = {
  name: '',
  primaryDomain: '',
}

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
}

function notifyWebsitesUpdated() {
  window.dispatchEvent(new Event('cms:websites-updated'))
}

export default function WebsiteSectionShell({
  sectionLabel,
  sectionTitle,
  sectionPath,
  afterCreatePath = sectionPath,
  children,
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedWebsiteId = searchParams.get('websiteId')
  const [websites, setWebsites] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const selectedWebsite = useMemo(
    () => websites.find((website) => website.id === selectedWebsiteId) || null,
    [selectedWebsiteId, websites],
  )
  const [editForm, setEditForm] = useState(null)

  async function loadWebsites() {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/cms/websites', { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to load websites.'))
        return
      }

      setWebsites(result.websites || [])
    } catch {
      setMessage('Unable to reach the CMS server. Restart the dev server and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWebsites()
  }, [])

  useEffect(() => {
    if (!selectedWebsite) {
      setEditForm(null)
      return
    }

    setEditForm({
      name: selectedWebsite.name,
      primaryDomain: selectedWebsite.primaryDomain,
      isActive: selectedWebsite.isActive,
    })
  }, [selectedWebsite])

  function selectWebsite(websiteId) {
    router.push(`${sectionPath}?websiteId=${websiteId}`)
    notifyWebsitesUpdated()
  }

  async function createWebsite(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch('/api/cms/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to create website.'))
        return
      }

      setCreateForm(emptyCreateForm)
      await loadWebsites()
      notifyWebsitesUpdated()
      router.push(`${afterCreatePath}?websiteId=${result.website.id}`)
    } catch {
      setMessage('Unable to reach the CMS server. Restart the dev server and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function updateWebsite(event) {
    event.preventDefault()
    if (!selectedWebsite || !editForm) return

    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(`/api/cms/websites/${selectedWebsite.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to update website.'))
        return
      }

      await loadWebsites()
      notifyWebsitesUpdated()
      selectWebsite(result.website.id)
    } catch {
      setMessage('Unable to reach the CMS server. Restart the dev server and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function deactivateSelectedWebsite() {
    if (!selectedWebsite) return

    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/cms/websites/${selectedWebsite.id}/deactivate`,
        { method: 'POST' },
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to deactivate website.'))
        return
      }

      await loadWebsites()
      notifyWebsitesUpdated()
      selectWebsite(result.website.id)
    } catch {
      setMessage('Unable to reach the CMS server. Restart the dev server and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="space-y-5">
        <PageHeader
          eyebrow={sectionLabel}
          title={sectionTitle}
          description="Choose the website context first. The selected website controls which records load in this section."
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadWebsites}
              disabled={loading}
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          }
        />

        <MessageAlert message={message} />

        <AdminPanel
          title="Websites"
          description="Website-scoped CMS resources load only for the selected website."
          contentClassName="p-0"
        >
          <div>
            {loading ? <LoadingState label="Loading websites..." /> : null}

            {!loading && websites.length === 0 ? (
              <EmptyState
                title="No websites yet"
                description="Create your first website from the panel on the right."
                className="m-4"
              />
            ) : null}

            {websites.map((website) => (
              <button
                key={website.id}
                type="button"
                onClick={() => selectWebsite(website.id)}
                className={`w-full border-b border-[#dcdcde] px-4 py-3 text-left transition last:border-b-0 ${
                  website.id === selectedWebsiteId
                    ? 'bg-[#f0f6fc] shadow-[inset_3px_0_0_#2271b1]'
                    : 'bg-white hover:bg-[#f6f7f7]'
                }`}
              >
                <span className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${
                        website.id === selectedWebsiteId
                          ? 'bg-[#dbeafe] text-[#2271b1]'
                          : 'bg-[#f6f7f7] text-[#2271b1]'
                      }`}
                    >
                      <Globe2 className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {website.name}
                      </span>
                      <span
                        className={`mt-1 block truncate text-sm ${
                          website.id === selectedWebsiteId
                            ? 'text-[#50575e]'
                            : 'text-[#646970]'
                        }`}
                      >
                        {website.primaryDomain}
                      </span>
                    </span>
                  </span>
                  <StatusBadge active={website.isActive}>
                    {website.isActive ? 'Active' : 'Inactive'}
                  </StatusBadge>
                </span>
              </button>
            ))}
          </div>
        </AdminPanel>

        {selectedWebsite ? <div className="pt-1">{children({ selectedWebsite })}</div> : null}
      </section>

      <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
        <div id="add-website" className="scroll-mt-20">
        <AdminPanel title="Add website" description="New websites start inactive.">
          <form onSubmit={createWebsite} className="space-y-4">
            <Field label="Name">
              <Input
                type="text"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Primary domain">
              <Input
                type="text"
                value={createForm.primaryDomain}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    primaryDomain: event.target.value,
                  }))
                }
                placeholder="example.com"
              />
            </Field>
            <Button
              type="submit"
              disabled={saving || !createForm.name || !createForm.primaryDomain}
              className="w-full"
            >
              <Plus />
              {saving ? 'Saving...' : 'Create website'}
            </Button>
          </form>
        </AdminPanel>
        </div>

        {selectedWebsite && editForm ? (
          <AdminPanel
            title="Selected website"
            description="These details control public domain resolution and site status."
          >
            <form onSubmit={updateWebsite} className="space-y-4">
              <Field label="Name">
                <Input
                  type="text"
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Primary domain">
                <Input
                  type="text"
                  value={editForm.primaryDomain}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      primaryDomain: event.target.value,
                    }))
                  }
                />
              </Field>
              <label className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-input"
                />
                Active public website
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="submit" disabled={saving}>
                  <Save />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={deactivateSelectedWebsite}
                  disabled={saving || !selectedWebsite.isActive}
                >
                  Deactivate
                </Button>
              </div>
            </form>
          </AdminPanel>
        ) : null}
      </aside>
    </div>
  )
}
