'use client'

import { useEffect, useState } from 'react'

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
}

export default function MediaLibrary({ websiteId }) {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [file, setFile] = useState(null)
  const [altText, setAltText] = useState('')
  const [caption, setCaption] = useState('')
  const [editing, setEditing] = useState({})
  const [usage, setUsage] = useState({})

  async function loadMedia() {
    if (!websiteId) return
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/cms/media?websiteId=${websiteId}&includeTrashed=true`,
        { cache: 'no-store' }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to load media.'))
        return
      }

      setMedia(result.media || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMedia()
  }, [websiteId])

  async function upload(event) {
    event.preventDefault()
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
      event.currentTarget.reset()
      await loadMedia()
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

  async function postMediaAction(mediaId, action) {
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/cms/media/${mediaId}/${action}?websiteId=${websiteId}`,
        { method: 'POST' }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, `Unable to ${action} media.`))
        return
      }

      await loadMedia()
    } finally {
      setSaving(false)
    }
  }

  async function deleteMedia(mediaId) {
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

  return (
    <section className="mt-8 border-t border-slate-200 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Media
          </p>
          <h3 className="mt-1 text-xl font-bold">Media library</h3>
        </div>
        <button
          type="button"
          onClick={loadMedia}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Refresh media'}
        </button>
      </div>

      {message ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {message}
        </p>
      ) : null}

      <form
        onSubmit={upload}
        className="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)_minmax(12rem,18rem)_auto]"
      >
        <label className="block text-sm font-medium text-slate-700">
          Image
          <input
            type="file"
            accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Alt text
          <input
            type="text"
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Caption
          <input
            type="text"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <button
          type="submit"
          disabled={saving || !file}
          className="self-end rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {saving ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {media.length === 0 && !loading ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No media for this website yet.
          </div>
        ) : null}

        {media.map((item) => {
          const draft = editing[item.id] || {
            altText: item.altText || '',
            caption: item.caption || '',
          }
          const itemUsage = usage[item.id]

          return (
            <article
              key={item.id}
              className={`rounded-lg border p-4 ${
                item.deletedAt
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="aspect-video overflow-hidden rounded-md bg-slate-100">
                <img
                  src={item.publicUrl}
                  alt={item.altText || ''}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {item.originalFilename}
                </p>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {item.width || '?'} x {item.height || '?'}
                </span>
              </div>
              <label className="mt-3 block text-sm font-medium text-slate-700">
                Alt text
                <input
                  type="text"
                  value={draft.altText}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      [item.id]: {
                        ...draft,
                        altText: event.target.value,
                      },
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                />
              </label>
              <label className="mt-3 block text-sm font-medium text-slate-700">
                Caption
                <input
                  type="text"
                  value={draft.caption}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      [item.id]: {
                        ...draft,
                        caption: event.target.value,
                      },
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => patchMedia(item.id)}
                  disabled={saving}
                  className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  Save
                </button>
                {item.deletedAt ? (
                  <>
                    <button
                      type="button"
                      onClick={() => postMediaAction(item.id, 'restore')}
                      disabled={saving}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMedia(item.id)}
                      disabled={saving}
                      className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:border-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => postMediaAction(item.id, 'trash')}
                    disabled={saving}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-700 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Trash
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => loadUsage(item.id)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                >
                  Usage
                </button>
              </div>
              {itemUsage ? (
                <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {itemUsage.referenced
                    ? `${itemUsage.locations?.length || 0} reference(s) found.`
                    : 'No references found.'}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
