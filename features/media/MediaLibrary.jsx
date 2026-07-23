'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Upload } from 'lucide-react'
import {
  AdminPanel,
  EmptyState,
  Field,
  MessageAlert,
  PageHeader,
} from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PAGE_SIZE = 20

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

function formatFileSize(value) {
  const bytes = Number(value || 0)
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDimensions(width, height) {
  if (!width || !height) return '-'
  return `${width} by ${height} pixels`
}

function mediaMatchesSearch(item, query) {
  if (!query) return true

  const haystack = [
    item.originalFilename,
    item.altText,
    item.caption,
    item.mimeType,
    item.source,
    item.storagePath,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query.toLowerCase())
}

function getMediaTitle(item) {
  return (
    item.altText ||
    item.caption ||
    getReadableFilename(item.originalFilename) ||
    'Untitled media'
  )
}

function getReadableFilename(value) {
  const name = typeof value === 'string' ? value.trim() : ''
  if (!name) return ''
  return name.replace(/\.[^.]+$/, '')
}

function getAltTextDisplay(item) {
  return (
    item.altText ||
    getReadableFilename(item.originalFilename) ||
    getReadableFilename(getStoredFilename(item)) ||
    'Media image'
  )
}

function getStoredFilename(item) {
  const path = item.storagePath || item.publicUrl || ''
  return path.split('/').filter(Boolean).pop() || 'optimized.webp'
}

export default function MediaLibrary({ websiteId }) {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [message, setMessage] = useState('')
  const [file, setFile] = useState(null)
  const [altText, setAltText] = useState('')
  const [caption, setCaption] = useState('')
  const [editing, setEditing] = useState({})
  const [usage, setUsage] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkAction, setBulkAction] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const searchFilteredMedia = useMemo(
    () => media.filter((item) => mediaMatchesSearch(item, searchQuery)),
    [media, searchQuery]
  )

  const filteredMedia = searchFilteredMedia

  const pageCount = Math.max(1, Math.ceil(filteredMedia.length / PAGE_SIZE))
  const visibleMedia = filteredMedia.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, websiteId])

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount))
  }, [pageCount])

  async function loadMedia() {
    if (!websiteId) return
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(`/api/cms/media?websiteId=${websiteId}`, {
        cache: 'no-store',
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to load media.'))
        return
      }

      const nextMedia = result.media || []
      const nextIds = new Set(nextMedia.map((item) => item.id))
      setMedia(nextMedia)
      setSelectedIds((current) => current.filter((id) => nextIds.has(id)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMedia()
  }, [websiteId])

  async function upload(event) {
    event.preventDefault()
    const form = event.currentTarget
    if (!file) return

    setSaving(true)
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('altText', altText)
      formData.append('caption', caption)

      const response = await fetch(`/api/cms/media?websiteId=${websiteId}`, {
        method: 'POST',
        body: formData,
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to upload media.'))
        return
      }

      setFile(null)
      setAltText('')
      setCaption('')
      form.reset()
      await loadMedia()
      setMessage('Image uploaded, compressed, and converted to WebP.')
    } finally {
      setSaving(false)
    }
  }

  async function patchMedia(mediaId) {
    const draft = editing[mediaId]
    if (!draft) return

    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(`/api/cms/media/${mediaId}?websiteId=${websiteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to update media.'))
        return
      }

      setEditing((current) => {
        const next = { ...current }
        delete next[mediaId]
        return next
      })
      await loadMedia()
    } finally {
      setSaving(false)
    }
  }

  async function deleteMedia(mediaId) {
    if (!window.confirm('Delete this media item permanently?')) return
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(`/api/cms/media/${mediaId}?websiteId=${websiteId}`, {
        method: 'DELETE',
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to permanently delete media.'))
        return
      }

      await loadMedia()
    } finally {
      setSaving(false)
    }
  }

  async function bulkDeleteMedia() {
    if (bulkAction !== 'delete') {
      setMessage('Choose a bulk action first.')
      return
    }

    if (selectedIds.length === 0) {
      setMessage('Select at least one media item.')
      return
    }

    if (
      !window.confirm(
        `Delete ${selectedIds.length} selected media item(s) permanently? This cannot be undone.`
      )
    ) {
      return
    }

    setSaving(true)
    setMessage('')

    let deletedCount = 0
    const failures = []

    try {
      for (const mediaId of selectedIds) {
        const response = await fetch(
          `/api/cms/media/${mediaId}?websiteId=${websiteId}`,
          {
            method: 'DELETE',
          }
        )
        const result = await response.json().catch(() => ({}))

        if (response.ok) {
          deletedCount += 1
        } else {
          failures.push(getApiMessage(result, 'Unable to delete media.'))
        }
      }

      setSelectedIds([])
      setBulkAction('')
      await loadMedia()

      if (failures.length > 0) {
        setMessage(
          `${deletedCount} deleted. ${failures.length} could not be deleted. ${failures[0]}`
        )
      } else {
        setMessage(`${deletedCount} media item(s) deleted.`)
      }
    } finally {
      setSaving(false)
    }
  }

  async function backfillResponsiveVariants() {
    setBackfilling(true)
    setMessage('')

    try {
      let totalUpdated = 0
      let remainingCount = 0
      let failures = []

      for (let batch = 0; batch < 100; batch += 1) {
        const response = await fetch(
          `/api/cms/media/variants/backfill?websiteId=${websiteId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limit: 5 }),
          }
        )
        const result = await response.json().catch(() => ({}))

        if (!response.ok) {
          setMessage(getApiMessage(result, 'Unable to generate responsive variants.'))
          return
        }

        const report = result.backfill || {}
        const updatedCount = Number(report.updatedCount || 0)
        totalUpdated += updatedCount
        remainingCount = Number(report.remainingCount || 0)
        failures = Array.isArray(report.failures) ? report.failures : []

        if (remainingCount === 0) break
        if (updatedCount === 0) {
          setMessage(
            `${totalUpdated} media item(s) updated. ${remainingCount} could not be completed: ${failures[0]?.message || 'check the media and try again.'}`
          )
          await loadMedia()
          return
        }
      }

      await loadMedia()
      setMessage(
        remainingCount > 0
          ? `${totalUpdated} media item(s) updated. ${remainingCount} still need variants; run this again to continue.`
          : `${totalUpdated} media item(s) updated. All responsive variants are ready.`
      )
    } finally {
      setBackfilling(false)
    }
  }

  async function loadUsage(mediaId) {
    setMessage('')

    const response = await fetch(
      `/api/cms/media/${mediaId}/usage?websiteId=${websiteId}`,
      { cache: 'no-store' }
    )
    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(getApiMessage(result, 'Unable to load media usage.'))
      return
    }

    setUsage((current) => ({
      ...current,
      [mediaId]: result.usage,
    }))
  }

  function startEdit(item) {
    setEditing((current) => ({
      ...current,
      [item.id]: current[item.id] || {
        altText: item.altText || '',
        caption: item.caption || '',
      },
    }))
  }

  function cancelEdit(mediaId) {
    setEditing((current) => {
      const next = { ...current }
      delete next[mediaId]
      return next
    })
  }

  function updateDraft(mediaId, key, value) {
    setEditing((current) => ({
      ...current,
      [mediaId]: {
        ...(current[mediaId] || { altText: '', caption: '' }),
        [key]: value,
      },
    }))
  }

  async function copyPublicUrl(url) {
    try {
      await navigator.clipboard.writeText(url)
      setMessage('Media URL copied to clipboard.')
    } catch {
      setMessage('Unable to copy URL. Select and copy the URL manually.')
    }
  }

  async function downloadMedia(item) {
    setMessage('')

    try {
      const response = await fetch(item.publicUrl)
      if (!response.ok) {
        throw new Error('Download failed.')
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = getStoredFilename(item)
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      window.open(item.publicUrl, '_blank', 'noopener,noreferrer')
      setMessage('Unable to start a direct download, so the media opened in a new tab.')
    }
  }

  function toggleMediaSelection(mediaId) {
    setSelectedIds((current) =>
      current.includes(mediaId)
        ? current.filter((id) => id !== mediaId)
        : [...current, mediaId]
    )
  }

  function toggleVisibleSelection() {
    const visibleIds = visibleMedia.map((item) => item.id)
    const allVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))

    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id))
      }

      return Array.from(new Set([...current, ...visibleIds]))
    })
  }

  function renderMediaRows(items) {
    return items.map((item) => {
      const draft = editing[item.id]
      const itemUsage = usage[item.id]
      const variants = Object.entries(item.variants || {})

      return (
        <Fragment key={item.id}>
          <tr
            className="border-b border-[#f0f0f1] align-top odd:bg-white even:bg-[#f6f7f7]"
          >
            <td className="w-10 px-3 py-3">
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => toggleMediaSelection(item.id)}
                aria-label={`Select ${getMediaTitle(item)}`}
              />
            </td>
            <td className="px-3 py-3">
              <div className="flex gap-3">
                <img
                  src={item.publicUrl}
                  alt={getAltTextDisplay(item)}
                  className="h-[60px] w-[60px] shrink-0 border border-[#dcdcde] object-cover"
                />
                <div className="min-w-0">
                  <a
                    href={item.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-[#005cbb] hover:text-[#003f85]"
                  >
                    {getMediaTitle(item)}
                  </a>
                  <p className="mt-1 break-all text-[#1f2330]">
                    Stored: {getStoredFilename(item)}
                  </p>
                  <p className="mt-1 text-[#50575e]">
                    Type: {item.mimeType || 'image/webp'}
                  </p>
                  {item.originalFilename ? (
                    <p className="mt-1 break-all text-[#50575e]">
                      Uploaded as: {item.originalFilename}
                    </p>
                  ) : null}
                  <details className="mt-2 text-[#50575e]">
                    <summary className="cursor-pointer font-medium text-[#005cbb]">
                      Responsive variants ({variants.length})
                    </summary>
                    {variants.length > 0 ? (
                      <ul className="mt-1 space-y-1">
                        {variants.map(([name, variant]) => (
                          <li key={name}>
                            {name}: {formatDimensions(variant.width, variant.height)} - {formatFileSize(variant.fileSize)}{' '}
                            <a href={variant.url} target="_blank" rel="noreferrer" className="text-[#005cbb] hover:text-[#003f85]">
                              View
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1">No generated variants yet.</p>
                    )}
                  </details>
                </div>
              </div>
            </td>
            <td className="px-3 py-3 text-[#50575e]">
              {getAltTextDisplay(item)}
            </td>
            <td className="px-3 py-3">{formatFileSize(item.fileSize)}</td>
            <td className="px-3 py-3">
              {formatDimensions(item.width, item.height)}
            </td>
            <td className="px-3 py-3">{formatDate(item.createdAt)}</td>
            <td className="px-3 py-3">
              <div className="flex flex-wrap gap-x-2 gap-y-1 text-[#005cbb]">
                {!draft ? (
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="hover:text-[#003f85]"
                  >
                    Edit
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => deleteMedia(item.id)}
                  disabled={saving}
                  className="text-red-700 hover:text-red-900 disabled:opacity-60"
                >
                  Delete
                </button>
                <a
                  href={item.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#003f85]"
                >
                  View
                </a>
                <button
                  type="button"
                  onClick={() => copyPublicUrl(item.publicUrl)}
                  className="hover:text-[#003f85]"
                >
                  Copy URL
                </button>
                <button
                  type="button"
                  onClick={() => downloadMedia(item)}
                  className="hover:text-[#003f85]"
                >
                  Download file
                </button>
                <button
                  type="button"
                  onClick={() => loadUsage(item.id)}
                  className="hover:text-[#003f85]"
                >
                  Usage
                </button>
              </div>
              {itemUsage ? (
                <div className="mt-2 text-[#50575e]">
                  {itemUsage.referenced
                    ? `${itemUsage.locations?.length || 0} reference(s) found.`
                    : 'No references found.'}
                </div>
              ) : null}
            </td>
          </tr>
          {draft ? (
            <tr
              key={`${item.id}-edit`}
              className="border-b border-[#dcdcde] bg-white"
            >
              <td colSpan={7} className="px-3 py-4">
                <div className="grid gap-4 rounded-[3px] border border-[#c3c4c7] bg-[#f6f7f7] p-4 md:grid-cols-2">
                  <label className="block text-[13px] font-medium text-[#1f2330]">
                    Alternative Text
                    <textarea
                      value={draft.altText}
                      onChange={(event) =>
                        updateDraft(item.id, 'altText', event.target.value)
                      }
                      rows={3}
                      className="mt-2 w-full rounded-[3px] border border-[#8c8f94] bg-white px-2 py-2 text-[13px] outline-none"
                    />
                  </label>
                  <label className="block text-[13px] font-medium text-[#1f2330]">
                    Caption
                    <textarea
                      value={draft.caption}
                      onChange={(event) =>
                        updateDraft(item.id, 'caption', event.target.value)
                      }
                      rows={3}
                      className="mt-2 w-full rounded-[3px] border border-[#8c8f94] bg-white px-2 py-2 text-[13px] outline-none"
                    />
                  </label>
                  <div className="md:col-span-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => patchMedia(item.id)}
                      disabled={saving}
                      className="rounded-[3px] bg-[#3858e9] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#2944c9] disabled:opacity-60"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelEdit(item.id)}
                      className="rounded-[3px] border border-[#8c8f94] bg-white px-4 py-2 text-[13px] font-semibold text-[#1f2330] hover:border-[#1f2330]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          ) : null}
        </Fragment>
      )
    })
  }

  function renderMediaTable(items, title) {
    if (items.length === 0) return null

    return (
      <div className="overflow-x-auto">
        {title ? (
          <h3 className="border-b border-[#dcdcde] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1f2330]">
            {title}
          </h3>
        ) : null}
        <table className="w-full min-w-[60rem] border-collapse text-left text-[13px] text-[#1f2330]">
          <thead>
            <tr className="border-b border-[#c3c4c7] bg-white text-[#3858e9]">
              <th className="w-10 px-3 py-2 font-medium">
                <input
                  type="checkbox"
                  checked={
                    visibleMedia.length > 0 &&
                    visibleMedia.every((item) => selectedIds.includes(item.id))
                  }
                  onChange={toggleVisibleSelection}
                  aria-label="Select all visible media"
                />
              </th>
              <th className="px-3 py-2 font-medium">File</th>
              <th className="w-56 px-3 py-2 font-medium">Alt text</th>
              <th className="w-32 px-3 py-2 font-medium">File size</th>
              <th className="w-48 px-3 py-2 font-medium">Dimensions</th>
              <th className="w-36 px-3 py-2 font-medium">Date</th>
              <th className="w-52 px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>{renderMediaRows(items)}</tbody>
        </table>
      </div>
    )
  }

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Media"
        title="Media library"
        description="Upload optimized WebP images and manage alt text, captions, usage, and permanent delete checks."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={backfillResponsiveVariants}
              disabled={backfilling || loading}
            >
              <RefreshCw className={backfilling ? 'animate-spin' : ''} />
              {backfilling ? 'Generating...' : 'Generate missing variants'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadMedia}
              disabled={loading || backfilling}
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        }
      />

      <MessageAlert message={message} />

      <AdminPanel title="Upload image" description="Images are converted to WebP and stored under this website's storage path.">
        <form
          onSubmit={upload}
          className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)_minmax(12rem,18rem)_auto]"
        >
          <Field label="Image">
            <Input
              type="file"
              accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </Field>
          <Field label="Alt text">
            <Input
              type="text"
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
            />
          </Field>
          <Field label="Caption">
            <Input
              type="text"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
            />
          </Field>
          <Button type="submit" disabled={saving || !file} className="self-end">
            <Upload />
            {saving ? 'Uploading...' : 'Upload'}
          </Button>
        </form>
      </AdminPanel>

      <div className="border border-[#c3c4c7] bg-white">
        <div className="flex justify-center border-b border-[#dcdcde] p-3">
          <input
            aria-label="Search media"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search media"
            className="h-8 w-full max-w-md rounded-[3px] border border-[#8c8f94] bg-white px-2 text-[13px] outline-none focus:border-[#3858e9] focus:ring-1 focus:ring-[#3858e9]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-[#dcdcde] bg-[#f6f7f7] p-3 text-[13px] text-[#50575e]">
            <select
              value={bulkAction}
              onChange={(event) => setBulkAction(event.target.value)}
              aria-label="Bulk actions"
              className="h-8 rounded-[3px] border border-[#8c8f94] bg-white px-2 text-[13px] outline-none"
            >
              <option value="">Bulk actions</option>
              <option value="delete">Delete selected</option>
            </select>
            <button
              type="button"
              onClick={bulkDeleteMedia}
              disabled={saving}
              className="h-8 rounded-[3px] border border-[#3858e9] bg-white px-3 text-[13px] font-medium text-[#3858e9] hover:bg-[#f0f3ff] disabled:opacity-60"
            >
              Apply
            </button>
            <span className="ml-auto">{filteredMedia.length} items</span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage <= 1}
              className="h-8 rounded-[3px] border border-[#c3c4c7] bg-white px-2 disabled:opacity-50"
              aria-label="Previous media page"
            >
              ‹
            </button>
            <span className="rounded-[3px] border border-[#8c8f94] bg-white px-3 py-1">
              {currentPage} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
              disabled={currentPage >= pageCount}
              className="h-8 rounded-[3px] border border-[#3858e9] bg-white px-2 text-[#3858e9] disabled:border-[#c3c4c7] disabled:text-[#8c8f94] disabled:opacity-50"
              aria-label="Next media page"
            >
              ›
            </button>
        </div>

        {media.length === 0 && !loading ? (
          <div className="p-6">
            <EmptyState
              title="No media yet"
              description="Upload the first image for this website to make it available for posts, authors, SEO images, and template content."
            />
          </div>
        ) : null}

        {media.length > 0 && filteredMedia.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-[#596171]">
            No media matched your search.
          </div>
        ) : null}

        {filteredMedia.length > 0 ? (
          renderMediaTable(visibleMedia, '')
        ) : null}
      </div>
    </section>
  )
}
