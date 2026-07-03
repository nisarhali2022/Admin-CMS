'use client'

import { useEffect, useState } from 'react'

const emptyForm = {
  name: '',
  slug: '',
  bio: '',
  avatarImageId: '',
  isActive: true,
}

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
}

export default function AuthorsManager({ websiteId }) {
  const [authors, setAuthors] = useState([])
  const [media, setMedia] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function loadAuthors() {
    if (!websiteId) return
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/cms/authors?websiteId=${websiteId}&includeTrashed=true`,
        { cache: 'no-store' }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to load authors.'))
        return
      }

      setAuthors(result.authors || [])
    } finally {
      setLoading(false)
    }
  }

  async function loadMedia() {
    if (!websiteId) return

    const response = await fetch(`/api/cms/media?websiteId=${websiteId}`, {
      cache: 'no-store',
    })
    const result = await response.json().catch(() => ({}))

    if (response.ok) setMedia(result.media || [])
  }

  useEffect(() => {
    loadAuthors()
    loadMedia()
  }, [websiteId])

  async function createAuthor(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(`/api/cms/authors?websiteId=${websiteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          avatarImageId: form.avatarImageId || null,
        }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to create author.'))
        return
      }

      setForm(emptyForm)
      await loadAuthors()
    } finally {
      setSaving(false)
    }
  }

  async function updateAuthor(authorId) {
    const draft = editing[authorId]
    if (!draft) return
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(`/api/cms/authors/${authorId}?websiteId=${websiteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          avatarImageId: draft.avatarImageId || null,
        }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to update author.'))
        return
      }

      setEditing((current) => {
        const next = { ...current }
        delete next[authorId]
        return next
      })
      await loadAuthors()
    } finally {
      setSaving(false)
    }
  }

  async function authorAction(authorId, action, method = 'POST') {
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/cms/authors/${authorId}${action ? `/${action}` : ''}?websiteId=${websiteId}`,
        { method }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to update author.'))
        return
      }

      await loadAuthors()
    } finally {
      setSaving(false)
    }
  }

  function mediaOptions() {
    return (
      <>
        <option value="">No avatar</option>
        {media.map((item) => (
          <option key={item.id} value={item.id}>
            {item.altText || item.originalFilename}
          </option>
        ))}
      </>
    )
  }

  return (
    <section className="mt-8 border-t border-slate-200 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Blog
          </p>
          <h3 className="mt-1 text-xl font-bold">Authors</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            loadAuthors()
            loadMedia()
          }}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Refresh authors'}
        </button>
      </div>

      {message ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {message}
        </p>
      ) : null}

      <form
        onSubmit={createAuthor}
        className="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-2"
      >
        <input
          type="text"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Name"
          className="rounded-md border border-slate-300 bg-white px-3 py-2"
        />
        <input
          type="text"
          value={form.slug}
          onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
          placeholder="Slug"
          className="rounded-md border border-slate-300 bg-white px-3 py-2"
        />
        <textarea
          value={form.bio}
          onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
          placeholder="Bio"
          rows={3}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 lg:col-span-2"
        />
        <select
          value={form.avatarImageId}
          onChange={(event) =>
            setForm((current) => ({ ...current, avatarImageId: event.target.value }))
          }
          className="rounded-md border border-slate-300 bg-white px-3 py-2"
        >
          {mediaOptions()}
        </select>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) =>
              setForm((current) => ({ ...current, isActive: event.target.checked }))
            }
            className="h-4 w-4 rounded border-slate-300"
          />
          Active author
        </label>
        <button
          type="submit"
          disabled={saving || !form.name}
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          Add author
        </button>
      </form>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {authors.map((author) => {
          const draft = editing[author.id] || {
            name: author.name,
            slug: author.slug,
            bio: author.bio || '',
            avatarImageId: author.avatarImageId || '',
            isActive: author.isActive,
          }

          return (
            <article
              key={author.id}
              className={`rounded-lg border p-4 ${
                author.deletedAt ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 overflow-hidden rounded-md bg-slate-100">
                  {author.avatarImage?.publicUrl ? (
                    <img
                      src={author.avatarImage.publicUrl}
                      alt={author.avatarImage.altText || ''}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(event) =>
                      setEditing((current) => ({
                        ...current,
                        [author.id]: { ...draft, name: event.target.value },
                      }))
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  />
                  <input
                    type="text"
                    value={draft.slug}
                    onChange={(event) =>
                      setEditing((current) => ({
                        ...current,
                        [author.id]: { ...draft, slug: event.target.value },
                      }))
                    }
                    className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  />
                </div>
              </div>
              <textarea
                value={draft.bio}
                onChange={(event) =>
                  setEditing((current) => ({
                    ...current,
                    [author.id]: { ...draft, bio: event.target.value },
                  }))
                }
                rows={3}
                className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              />
              <select
                value={draft.avatarImageId}
                onChange={(event) =>
                  setEditing((current) => ({
                    ...current,
                    [author.id]: { ...draft, avatarImageId: event.target.value },
                  }))
                }
                className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              >
                {mediaOptions()}
              </select>
              <label className="mt-3 flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      [author.id]: { ...draft, isActive: event.target.checked },
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Active
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateAuthor(author.id)}
                  disabled={saving}
                  className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
                >
                  Save
                </button>
                {author.deletedAt ? (
                  <>
                    <button
                      type="button"
                      onClick={() => authorAction(author.id, 'restore')}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => authorAction(author.id, '', 'DELETE')}
                      className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => authorAction(author.id, 'trash')}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"
                  >
                    Trash
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
