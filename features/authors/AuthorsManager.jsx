'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, UserRound } from 'lucide-react'
import { MessageAlert } from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'

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

function buildPostCounts(posts) {
  return posts.reduce((counts, post) => {
    if (!post.authorId) return counts
    counts[post.authorId] = (counts[post.authorId] || 0) + 1
    return counts
  }, {})
}

function authorMatchesSearch(author, query) {
  if (!query) return true

  const haystack = [author.name, author.slug, author.bio]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query.toLowerCase())
}

function AuthorAvatarPreview({ image, label = 'Author image', size = 'md' }) {
  const sizeClass = size === 'lg' ? 'h-20 w-20' : 'h-12 w-12'

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center overflow-hidden rounded-sm border border-[#c3c4c7] bg-[#f0f0f1] text-[#646970]`}
      aria-label={label}
    >
      {image?.publicUrl ? (
        <img
          src={image.publicUrl}
          alt={image.altText || label}
          className="h-full w-full object-cover"
        />
      ) : (
        <UserRound className={size === 'lg' ? 'h-9 w-9' : 'h-6 w-6'} />
      )}
    </div>
  )
}

export default function AuthorsManager({ websiteId }) {
  const [authors, setAuthors] = useState([])
  const [media, setMedia] = useState([])
  const [postCounts, setPostCounts] = useState({})
  const [countsFailed, setCountsFailed] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState({})
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkAction, setBulkAction] = useState('trash')
  const [searchDraft, setSearchDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const filteredAuthors = useMemo(
    () => authors.filter((author) => authorMatchesSearch(author, searchQuery)),
    [authors, searchQuery]
  )

  const allVisibleSelected =
    filteredAuthors.length > 0 &&
    filteredAuthors.every((author) => selectedIds.includes(author.id))

  async function loadAuthors() {
    if (!websiteId) return
    setLoading(true)
    setMessage('')
    setCountsFailed(false)

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
      setSelectedIds((current) =>
        current.filter((id) => (result.authors || []).some((author) => author.id === id))
      )

      try {
        const postsResponse = await fetch(`/api/cms/posts?websiteId=${websiteId}`, {
          cache: 'no-store',
        })
        const postsResult = await postsResponse.json().catch(() => ({}))

        if (!postsResponse.ok) {
          setPostCounts({})
          setCountsFailed(true)
          return
        }

        setPostCounts(buildPostCounts(postsResult.posts || []))
      } catch {
        setPostCounts({})
        setCountsFailed(true)
      }
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

  async function authorAction(authorId, action, method = 'POST', reload = true) {
    if (reload) {
      setSaving(true)
      setMessage('')
    }

    try {
      const response = await fetch(
        `/api/cms/authors/${authorId}${action ? `/${action}` : ''}?websiteId=${websiteId}`,
        { method }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to update author.'))
        return false
      }

      if (reload) await loadAuthors()
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
      for (const authorId of selectedIds) {
        const ok = await authorAction(authorId, bulkAction, 'POST', false)
        if (!ok) return
      }
      setSelectedIds([])
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

  function getAvatarImage(author) {
    return author.avatarImage || media.find((item) => item.id === author.avatarImageId)
  }

  function getMediaById(mediaId) {
    return media.find((item) => item.id === mediaId)
  }

  function toggleVisibleSelection(checked) {
    const visibleIds = filteredAuthors.map((author) => author.id)

    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, ...visibleIds]))
      return current.filter((id) => !visibleIds.includes(id))
    })
  }

  function toggleAuthorSelection(authorId, checked) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, authorId]))
      return current.filter((id) => id !== authorId)
    })
  }

  function startEditing(author) {
    setEditing((current) => ({
      ...current,
      [author.id]: {
        name: author.name,
        slug: author.slug,
        bio: author.bio || '',
        avatarImageId: author.avatarImageId || '',
        isActive: author.isActive,
      },
    }))
  }

  function cancelEditing(authorId) {
    setEditing((current) => {
      const next = { ...current }
      delete next[authorId]
      return next
    })
  }

  function submitSearch(event) {
    event.preventDefault()
    setSearchQuery(searchDraft.trim())
  }

  const formAvatarImage = getMediaById(form.avatarImageId)

  return (
    <section className="category-taxonomy-screen space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[1.55rem] font-normal leading-tight text-[#1f2330]">
          Authors
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            loadAuthors()
            loadMedia()
          }}
          disabled={loading}
        >
          <RefreshCw className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      <MessageAlert message={message} />

      <div className="space-y-6">
        <form
          onSubmit={createAuthor}
          className="space-y-5 border border-[#c3c4c7] bg-white p-4"
        >
          <h3 className="text-[1rem] font-semibold text-[#1f2330]">Add Author</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block font-medium text-[#1f2330]" htmlFor="author-name">
                Name
              </label>
              <input
                id="author-name"
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
              />
              <p className="text-[0.85rem] leading-5 text-[#596171]">
                The name is shown on blog bylines and public post pages.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block font-medium text-[#1f2330]" htmlFor="author-slug">
                Slug
              </label>
              <input
                id="author-slug"
                type="text"
                value={form.slug}
                onChange={(event) =>
                  setForm((current) => ({ ...current, slug: event.target.value }))
                }
                className="w-full rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
              />
              <p className="text-[0.85rem] leading-5 text-[#596171]">
                The slug is the URL-friendly version of the author name.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block font-medium text-[#1f2330]" htmlFor="author-bio">
                Bio
              </label>
              <textarea
                id="author-bio"
                value={form.bio}
                onChange={(event) =>
                  setForm((current) => ({ ...current, bio: event.target.value }))
                }
                rows={6}
                className="w-full rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
              />
              <p className="text-[0.85rem] leading-5 text-[#596171]">
                The bio can appear on public author and post pages.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block font-medium text-[#1f2330]" htmlFor="author-avatar">
                Author Image
              </label>
              <div className="flex items-start gap-3">
                <AuthorAvatarPreview
                  image={formAvatarImage}
                  label="Selected author image preview"
                  size="lg"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <select
                    id="author-avatar"
                    value={form.avatarImageId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        avatarImageId: event.target.value,
                      }))
                    }
                    className="w-full rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
                  >
                    {mediaOptions()}
                  </select>
                  <p className="text-[0.85rem] leading-5 text-[#596171]">
                    Select an uploaded Media Library image for this author.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 font-medium text-[#1f2330]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((current) => ({ ...current, isActive: event.target.checked }))
              }
              className="h-4 w-4 border-[#8c8f94]"
            />
            Active author
          </label>

          <button
            type="submit"
            disabled={saving || !form.name}
            className="rounded-[3px] bg-[#3858e9] px-4 py-2 font-semibold text-white transition hover:bg-[#2944c9] disabled:cursor-not-allowed disabled:bg-[#a7b0f7]"
          >
            Add Author
          </button>
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
              aria-label="Search authors"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-[3px] border border-[#3858e9] bg-white px-4 py-2 font-semibold text-[#3858e9] hover:bg-[#f0f3ff]"
            >
              <Search className="h-3.5 w-3.5" />
              Search Authors
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
              {filteredAuthors.length} {filteredAuthors.length === 1 ? 'item' : 'items'}
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
                      aria-label="Select all visible authors"
                    />
                  </th>
                  <th className="px-3 py-2 font-medium">Author</th>
                  <th className="px-3 py-2 font-medium">Bio</th>
                  <th className="px-3 py-2 font-medium">Slug</th>
                  <th className="w-24 px-3 py-2 font-medium">Status</th>
                  <th className="w-20 px-3 py-2 text-right font-medium">Count</th>
                  <th className="w-40 px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuthors.map((author) => {
                  const draft = editing[author.id]
                  const isEditing = Boolean(draft)
                  const isSelected = selectedIds.includes(author.id)
                  const avatarImage = getAvatarImage(author)
                  const draftAvatarImage = isEditing ? getMediaById(draft.avatarImageId) : null
                  const bio = author.bio || '-'
                  const count = countsFailed ? '-' : postCounts[author.id] || 0

                  return (
                    <tr
                      key={author.id}
                      className={
                        author.deletedAt
                          ? 'border-b border-[#c3c4c7] bg-amber-50 align-top'
                          : 'border-b border-[#c3c4c7] bg-white align-top odd:bg-[#f6f7f7]'
                      }
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(event) =>
                            toggleAuthorSelection(author.id, event.target.checked)
                          }
                          aria-label={`Select ${author.name}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex items-start gap-3">
                              <AuthorAvatarPreview
                                image={draftAvatarImage}
                                label="Selected author image preview"
                              />
                              <select
                                value={draft.avatarImageId}
                                onChange={(event) =>
                                  setEditing((current) => ({
                                    ...current,
                                    [author.id]: {
                                      ...draft,
                                      avatarImageId: event.target.value,
                                    },
                                  }))
                                }
                                className="min-w-0 flex-1 rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
                              >
                                {mediaOptions()}
                              </select>
                            </div>
                            <input
                              type="text"
                              value={draft.name}
                              onChange={(event) =>
                                setEditing((current) => ({
                                  ...current,
                                  [author.id]: { ...draft, name: event.target.value },
                                }))
                              }
                              className="w-full rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
                            />
                            <label className="flex items-center gap-2 text-[0.85rem] text-[#1f2330]">
                              <input
                                type="checkbox"
                                checked={draft.isActive}
                                onChange={(event) =>
                                  setEditing((current) => ({
                                    ...current,
                                    [author.id]: {
                                      ...draft,
                                      isActive: event.target.checked,
                                    },
                                  }))
                                }
                                className="h-4 w-4 border-[#8c8f94]"
                              />
                              Active
                            </label>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <AuthorAvatarPreview
                              image={avatarImage}
                              label={`${author.name} author image`}
                            />
                            <div className="min-w-0 space-y-1">
                              <p className="font-normal text-[#1f2330]">{author.name}</p>
                              {author.deletedAt ? (
                                <p className="text-[0.78rem] font-semibold uppercase text-amber-700">
                                  Trashed
                                </p>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[#1f2330]">
                        {isEditing ? (
                          <textarea
                            value={draft.bio}
                            onChange={(event) =>
                              setEditing((current) => ({
                                ...current,
                                [author.id]: { ...draft, bio: event.target.value },
                              }))
                            }
                            rows={3}
                            className="w-full rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
                          />
                        ) : (
                          bio
                        )}
                      </td>
                      <td className="px-3 py-3 text-[#1f2330]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={draft.slug}
                            onChange={(event) =>
                              setEditing((current) => ({
                                ...current,
                                [author.id]: { ...draft, slug: event.target.value },
                              }))
                            }
                            className="w-full rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
                          />
                        ) : (
                          author.slug
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-sm px-2 py-1 text-[0.78rem] font-semibold ${
                            author.isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-[#f0f0f1] text-[#646970]'
                          }`}
                        >
                          {author.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-[#1f2330]">{count}</td>
                      <td className="px-3 py-3">
                        {isEditing ? (
                          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[0.84rem]">
                            <button
                              type="button"
                              onClick={() => updateAuthor(author.id)}
                              disabled={saving}
                              className="font-medium text-[#3858e9] hover:underline disabled:text-[#8a93a7]"
                            >
                              Save
                            </button>
                            <span className="text-[#8c8f94]">|</span>
                            <button
                              type="button"
                              onClick={() => cancelEditing(author.id)}
                              className="font-medium text-[#3858e9] hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[0.84rem]">
                            <button
                              type="button"
                              onClick={() => startEditing(author)}
                              className="font-medium text-[#3858e9] hover:underline"
                            >
                              Edit
                            </button>
                            <span className="text-[#8c8f94]">|</span>
                            {author.deletedAt ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => authorAction(author.id, 'restore')}
                                  className="font-medium text-[#3858e9] hover:underline"
                                >
                                  Restore
                                </button>
                                <span className="text-[#8c8f94]">|</span>
                                <button
                                  type="button"
                                  onClick={() => authorAction(author.id, '', 'DELETE')}
                                  className="font-medium text-red-700 hover:underline"
                                >
                                  Delete Permanently
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => authorAction(author.id, 'trash')}
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
                {filteredAuthors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-[#596171]">
                      No authors found.
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
