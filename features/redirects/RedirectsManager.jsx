'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { MessageAlert } from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'

const emptyForm = {
  fromPath: '',
  toUrl: '',
  redirectType: 301,
  isActive: true,
}

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
}

function redirectMatchesSearch(redirect, query) {
  if (!query) return true

  const status = redirect.deletedAt
    ? 'trashed'
    : redirect.isActive
      ? 'active'
      : 'inactive'
  const haystack = [
    redirect.fromPath,
    redirect.toUrl,
    String(redirect.redirectType),
    status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query.toLowerCase())
}

export default function RedirectsManager({ websiteId }) {
  const [redirects, setRedirects] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState({})
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkAction, setBulkAction] = useState('trash')
  const [searchDraft, setSearchDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const filteredRedirects = useMemo(
    () => redirects.filter((redirect) => redirectMatchesSearch(redirect, searchQuery)),
    [redirects, searchQuery]
  )

  const allVisibleSelected =
    filteredRedirects.length > 0 &&
    filteredRedirects.every((redirect) => selectedIds.includes(redirect.id))

  async function loadRedirects() {
    if (!websiteId) return
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/cms/redirects?websiteId=${websiteId}&includeTrashed=true`,
        { cache: 'no-store' }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to load redirects.'))
        return
      }

      setRedirects(result.redirects || [])
      setSelectedIds((current) =>
        current.filter((id) => (result.redirects || []).some((redirect) => redirect.id === id))
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRedirects()
  }, [websiteId])

  async function createRedirect(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(`/api/cms/redirects?websiteId=${websiteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to create redirect.'))
        return
      }

      setForm(emptyForm)
      await loadRedirects()
    } finally {
      setSaving(false)
    }
  }

  async function updateRedirect(redirectId) {
    const draft = editing[redirectId]
    if (!draft) return
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/cms/redirects/${redirectId}?websiteId=${websiteId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to update redirect.'))
        return
      }

      setEditing((current) => {
        const next = { ...current }
        delete next[redirectId]
        return next
      })
      await loadRedirects()
    } finally {
      setSaving(false)
    }
  }

  async function redirectAction(redirectId, action, method = 'POST', reload = true) {
    if (reload) {
      setSaving(true)
      setMessage('')
    }

    try {
      const response = await fetch(
        `/api/cms/redirects/${redirectId}${action ? `/${action}` : ''}?websiteId=${websiteId}`,
        { method }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to update redirect.'))
        return false
      }

      if (reload) await loadRedirects()
      return true
    } finally {
      if (reload) setSaving(false)
    }
  }

  async function runBulkAction() {
    if (selectedIds.length === 0) return
    setSaving(true)
    setMessage('')

    try {
      for (const redirectId of selectedIds) {
        const ok = await redirectAction(redirectId, bulkAction, 'POST', false)
        if (!ok) return
      }
      setSelectedIds([])
      await loadRedirects()
    } finally {
      setSaving(false)
    }
  }

  function toggleVisibleSelection(checked) {
    const visibleIds = filteredRedirects.map((redirect) => redirect.id)

    setSelectedIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...visibleIds]))
      }

      return current.filter((id) => !visibleIds.includes(id))
    })
  }

  function toggleRedirectSelection(redirectId, checked) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, redirectId]))
      return current.filter((id) => id !== redirectId)
    })
  }

  function startEditing(redirect) {
    setEditing((current) => ({
      ...current,
      [redirect.id]: {
        fromPath: redirect.fromPath,
        toUrl: redirect.toUrl,
        redirectType: redirect.redirectType,
        isActive: redirect.isActive,
      },
    }))
  }

  function cancelEditing(redirectId) {
    setEditing((current) => {
      const next = { ...current }
      delete next[redirectId]
      return next
    })
  }

  function submitSearch(event) {
    event.preventDefault()
    setSearchQuery(searchDraft.trim())
  }

  return (
    <section className="category-taxonomy-screen space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
            Routing
          </p>
          <h2 className="text-[1.55rem] font-normal leading-tight text-[#1f2330]">
            Redirects
          </h2>
          <p className="mt-1 text-[0.92rem] text-[#3c434a]">
            Create and manage website-scoped 301 and 302 redirects.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadRedirects}
          disabled={loading}
        >
          <RefreshCw className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      <MessageAlert message={message} />

      <div className="space-y-6">
        <form
          onSubmit={createRedirect}
          className="space-y-4 border border-[#c3c4c7] bg-white p-4"
        >
          <h3 className="text-[1rem] font-semibold text-[#1f2330]">Add Redirect</h3>

          <div className="grid gap-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_10rem_10rem_auto] lg:items-start">
            <div className="space-y-2">
              <label className="block font-medium text-[#1f2330]" htmlFor="redirect-from-path">
                Source Path or URL
              </label>
              <input
                id="redirect-from-path"
                type="text"
                value={form.fromPath}
                onChange={(event) =>
                  setForm((current) => ({ ...current, fromPath: event.target.value }))
                }
                placeholder="/old-path or https://site.com/old-path"
                className="w-full rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
              />
              <p className="text-[0.85rem] leading-5 text-[#596171]">
                Paste a relative path or full old URL; it will save as a path.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block font-medium text-[#1f2330]" htmlFor="redirect-to-url">
                Destination URL
              </label>
              <input
                id="redirect-to-url"
                type="text"
                value={form.toUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, toUrl: event.target.value }))
                }
                placeholder="/new-path"
                className="w-full rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
              />
              <p className="text-[0.85rem] leading-5 text-[#596171]">
                Internal path or full URL.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block font-medium text-[#1f2330]" htmlFor="redirect-type">
                Type
              </label>
              <select
                id="redirect-type"
                value={form.redirectType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    redirectType: Number(event.target.value),
                  }))
                }
                className="w-full rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
              >
                <option value={301}>301</option>
                <option value={302}>302</option>
              </select>
              <p className="text-[0.85rem] leading-5 text-[#596171]">
                Permanent or temporary.
              </p>
            </div>

            <label className="flex items-center gap-3 font-medium text-[#1f2330] lg:mt-7">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isActive: event.target.checked }))
                }
                className="h-4 w-4 border-[#8c8f94]"
              />
              Active
            </label>

            <button
              type="submit"
              disabled={saving || !form.fromPath || !form.toUrl}
              className="rounded-[3px] bg-[#3858e9] px-4 py-2 font-semibold text-white transition hover:bg-[#2944c9] disabled:cursor-not-allowed disabled:bg-[#a7b0f7] lg:mt-6"
            >
              Add Redirect
            </button>
          </div>
        </form>

        <div className="min-w-0 space-y-3">
          <form
            onSubmit={submitSearch}
            className="flex flex-wrap items-center justify-end gap-2"
          >
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              className="w-full max-w-xs rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
              aria-label="Search redirects"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-[3px] border border-[#3858e9] bg-white px-4 py-2 font-semibold text-[#3858e9] hover:bg-[#f0f3ff]"
            >
              <Search className="h-3.5 w-3.5" />
              Search Redirects
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={bulkAction}
                onChange={(event) => setBulkAction(event.target.value)}
                className="rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
                aria-label="Bulk action"
              >
                <option value="trash">Trash selected</option>
                <option value="restore">Restore selected</option>
              </select>
              <button
                type="button"
                onClick={runBulkAction}
                disabled={saving || selectedIds.length === 0}
                className="rounded-[3px] border border-[#3858e9] bg-white px-4 py-2 font-semibold text-[#3858e9] hover:bg-[#f0f3ff] disabled:cursor-not-allowed disabled:border-[#b8bfd6] disabled:text-[#8a93a7]"
              >
                Apply
              </button>
            </div>
            <p className="text-[0.85rem] text-[#1f2330]">
              {filteredRedirects.length} {filteredRedirects.length === 1 ? 'item' : 'items'}
            </p>
          </div>

          <div className="overflow-x-auto border border-[#c3c4c7] bg-white">
            <table className="w-full min-w-[58rem] text-left text-[#1f2330]">
              <thead>
                <tr className="border-b border-[#c3c4c7] bg-white text-[#3858e9]">
                  <th className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(event) => toggleVisibleSelection(event.target.checked)}
                      aria-label="Select all visible redirects"
                    />
                  </th>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Destination</th>
                  <th className="w-28 px-3 py-2 font-medium">Type</th>
                  <th className="w-28 px-3 py-2 font-medium">Status</th>
                  <th className="w-44 px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRedirects.map((redirect) => {
                  const draft = editing[redirect.id]
                  const isEditing = Boolean(draft)
                  const isSelected = selectedIds.includes(redirect.id)
                  const status = redirect.deletedAt
                    ? 'Trashed'
                    : redirect.isActive
                      ? 'Active'
                      : 'Inactive'

                  return (
                    <tr
                      key={redirect.id}
                      className={
                        redirect.deletedAt
                          ? 'border-b border-[#c3c4c7] bg-amber-50 align-top'
                          : 'border-b border-[#c3c4c7] bg-white align-top odd:bg-[#f6f7f7]'
                      }
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(event) =>
                            toggleRedirectSelection(redirect.id, event.target.checked)
                          }
                          aria-label={`Select ${redirect.fromPath}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={draft.fromPath}
                            onChange={(event) =>
                              setEditing((current) => ({
                                ...current,
                                [redirect.id]: { ...draft, fromPath: event.target.value },
                              }))
                            }
                            className="w-full rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
                          />
                        ) : (
                          <div className="space-y-1">
                            <p className="font-normal text-[#1f2330]">
                              {redirect.fromPath}
                            </p>
                            {redirect.deletedAt ? (
                              <p className="text-[0.78rem] font-semibold uppercase text-amber-700">
                                Trashed
                              </p>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[#1f2330]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={draft.toUrl}
                            onChange={(event) =>
                              setEditing((current) => ({
                                ...current,
                                [redirect.id]: { ...draft, toUrl: event.target.value },
                              }))
                            }
                            className="w-full rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
                          />
                        ) : (
                          redirect.toUrl
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {isEditing ? (
                          <select
                            value={draft.redirectType}
                            onChange={(event) =>
                              setEditing((current) => ({
                                ...current,
                                [redirect.id]: {
                                  ...draft,
                                  redirectType: Number(event.target.value),
                                },
                              }))
                            }
                            className="w-full rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
                          >
                            <option value={301}>301</option>
                            <option value={302}>302</option>
                          </select>
                        ) : (
                          <span className="font-normal text-[#1f2330]">
                            {redirect.redirectType}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {isEditing ? (
                          <label className="flex items-center gap-2 text-[0.85rem] text-[#1f2330]">
                            <input
                              type="checkbox"
                              checked={draft.isActive}
                              onChange={(event) =>
                                setEditing((current) => ({
                                  ...current,
                                  [redirect.id]: {
                                    ...draft,
                                    isActive: event.target.checked,
                                  },
                                }))
                              }
                              className="h-4 w-4 border-[#8c8f94]"
                            />
                            Active
                          </label>
                        ) : (
                          <span
                            className={`inline-flex rounded-sm px-2 py-1 text-[0.78rem] font-semibold ${
                              redirect.deletedAt
                                ? 'bg-amber-100 text-amber-700'
                                : redirect.isActive
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-[#f0f0f1] text-[#646970]'
                            }`}
                          >
                            {status}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {isEditing ? (
                          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[0.84rem]">
                            <button
                              type="button"
                              onClick={() => updateRedirect(redirect.id)}
                              disabled={saving}
                              className="font-medium text-[#3858e9] hover:underline disabled:text-[#8a93a7]"
                            >
                              Save
                            </button>
                            <span className="text-[#8c8f94]">|</span>
                            <button
                              type="button"
                              onClick={() => cancelEditing(redirect.id)}
                              className="font-medium text-[#3858e9] hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[0.84rem]">
                            <button
                              type="button"
                              onClick={() => startEditing(redirect)}
                              className="font-medium text-[#3858e9] hover:underline"
                            >
                              Edit
                            </button>
                            <span className="text-[#8c8f94]">|</span>
                            {redirect.deletedAt ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => redirectAction(redirect.id, 'restore')}
                                  className="font-medium text-[#3858e9] hover:underline"
                                >
                                  Restore
                                </button>
                                <span className="text-[#8c8f94]">|</span>
                                <button
                                  type="button"
                                  onClick={() => redirectAction(redirect.id, '', 'DELETE')}
                                  className="font-medium text-red-700 hover:underline"
                                >
                                  Delete Permanently
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => redirectAction(redirect.id, 'trash')}
                                className="font-medium text-red-700 hover:underline"
                              >
                                Trash
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredRedirects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-[#596171]">
                      No redirects found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
