'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const emptyCreateForm = {
  name: '',
  primaryDomain: '',
}

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
}

export default function WebsiteSectionShell({
  sectionLabel,
  sectionTitle,
  sectionPath,
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
      const response = await fetch('/api/cms/websites', {
        cache: 'no-store',
      })
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
      selectWebsite(result.website.id)
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
      selectWebsite(result.website.id)
    } catch {
      setMessage('Unable to reach the CMS server. Restart the dev server and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {sectionLabel}
            </p>
            <h2 className="mt-1 text-2xl font-bold">{sectionTitle}</h2>
          </div>
          <button
            type="button"
            onClick={loadWebsites}
            disabled={loading}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Loading...' : 'Refresh websites'}
          </button>
        </div>

        {message ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
            {message}
          </p>
        ) : null}

        <div className="mt-6 grid gap-3">
          {loading ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
              Loading websites...
            </div>
          ) : null}

          {!loading && websites.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
              No websites have been added yet.
            </div>
          ) : null}

          {websites.map((website) => (
            <button
              key={website.id}
              type="button"
              onClick={() => selectWebsite(website.id)}
              className={`rounded-lg border px-4 py-4 text-left transition ${
                website.id === selectedWebsiteId
                  ? 'border-slate-950 bg-slate-950 text-white'
                  : 'border-slate-200 bg-white text-slate-950 hover:border-slate-400'
              }`}
            >
              <span className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  <span className="block font-semibold">{website.name}</span>
                  <span
                    className={`mt-1 block text-sm ${
                      website.id === selectedWebsiteId
                        ? 'text-slate-200'
                        : 'text-slate-500'
                    }`}
                  >
                    {website.primaryDomain}
                  </span>
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    website.isActive
                      ? 'bg-emerald-100 text-emerald-800'
                      : website.id === selectedWebsiteId
                        ? 'bg-white/15 text-slate-100'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {website.isActive ? 'Active' : 'Inactive'}
                </span>
              </span>
            </button>
          ))}
        </div>

        {selectedWebsite ? (
          <div className="mt-8 border-t border-slate-200 pt-8">
            {children({ selectedWebsite })}
          </div>
        ) : null}
      </section>

      <aside className="space-y-6">
        <form
          onSubmit={createWebsite}
          className="rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <h3 className="text-base font-bold">Add website</h3>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Name
            <input
              type="text"
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Primary domain
            <input
              type="text"
              value={createForm.primaryDomain}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  primaryDomain: event.target.value,
                }))
              }
              placeholder="example.com"
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <button
            type="submit"
            disabled={saving || !createForm.name || !createForm.primaryDomain}
            className="mt-4 w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? 'Saving...' : 'Create website'}
          </button>
        </form>

        {selectedWebsite && editForm ? (
          <form
            onSubmit={updateWebsite}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <h3 className="text-base font-bold">Selected website</h3>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Name
              <input
                type="text"
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Primary domain
              <input
                type="text"
                value={editForm.primaryDomain}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    primaryDomain: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
              />
            </label>
            <label className="mt-4 flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-950"
              />
              Active public website
            </label>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={deactivateSelectedWebsite}
                disabled={saving || !selectedWebsite.isActive}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-700 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Deactivate
              </button>
            </div>
          </form>
        ) : null}
      </aside>
    </div>
  )
}
