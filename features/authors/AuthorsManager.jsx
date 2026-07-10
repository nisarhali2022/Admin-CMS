'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, UserRound } from 'lucide-react'
import { MessageAlert } from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
  const [editingAuthorId, setEditingAuthorId] = useState(null)
  const [isAuthorImagePickerOpen, setIsAuthorImagePickerOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const filteredAuthors = useMemo(
    () => authors.filter((author) => authorMatchesSearch(author, searchQuery)),
    [authors, searchQuery]
  )

  async function loadAuthors() {
    if (!websiteId) return
    setLoading(true)
    setMessage('')
    setCountsFailed(false)

    try {
      const response = await fetch(`/api/cms/authors?websiteId=${websiteId}`, {
        cache: 'no-store',
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to load authors.'))
        return
      }

      setAuthors(result.authors || [])

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

  async function updateAuthor(event) {
    event.preventDefault()
    if (!editingAuthorId) return
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/cms/authors/${editingAuthorId}?websiteId=${websiteId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            avatarImageId: form.avatarImageId || null,
          }),
        }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to update author.'))
        return
      }

      setEditingAuthorId(null)
      setForm(emptyForm)
      await loadAuthors()
    } finally {
      setSaving(false)
    }
  }

  async function deleteAuthor(authorId) {
    if (!window.confirm('Delete this author permanently?')) return
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(`/api/cms/authors/${authorId}?websiteId=${websiteId}`, {
        method: 'DELETE',
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to delete author.'))
        return
      }

      await loadAuthors()
    } finally {
      setSaving(false)
    }
  }

  function getAvatarImage(author) {
    return author.avatarImage || media.find((item) => item.id === author.avatarImageId)
  }

  function getMediaById(mediaId) {
    return media.find((item) => item.id === mediaId)
  }

  function startEditing(author) {
    setEditingAuthorId(author.id)
    setForm({
      name: author.name,
      slug: author.slug,
      bio: author.bio || '',
      avatarImageId: author.avatarImageId || '',
      isActive: author.isActive,
    })
    setMessage('')
  }

  function cancelEditing() {
    setEditingAuthorId(null)
    setForm(emptyForm)
    setMessage('')
  }

  function submitSearch(event) {
    event.preventDefault()
    setSearchQuery(searchInput.trim())
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
          onSubmit={editingAuthorId ? updateAuthor : createAuthor}
          className="space-y-5 border border-[#c3c4c7] bg-white p-4"
        >
          <h3 className="text-[1rem] font-semibold text-[#1f2330]">
            {editingAuthorId ? 'Edit Author' : 'Add Author'}
          </h3>

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
              <span className="block font-medium text-[#1f2330]">
                Author Image
              </span>
              <div className="flex items-start gap-3">
                <AuthorAvatarPreview
                  image={formAvatarImage}
                  label="Selected author image preview"
                  size="lg"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsAuthorImagePickerOpen(true)}
                    className="rounded-[3px] border border-[#3858e9] bg-white px-3 py-1.5 font-medium text-[#3858e9] hover:bg-[#f0f3ff]"
                  >
                    {form.avatarImageId ? 'Change author image' : 'Select author image'}
                  </button>
                  {form.avatarImageId ? (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({ ...current, avatarImageId: '' }))
                      }
                      className="ml-2 rounded-[3px] border border-[#8c8f94] bg-white px-3 py-1.5 font-medium text-[#1f2330] hover:border-[#1f2330]"
                    >
                      Remove image
                    </button>
                  ) : null}
                  <p className="text-[0.85rem] leading-5 text-[#596171]">
                    Select an uploaded Media Library image for this author.
                  </p>
                </div>
              </div>
              <Dialog
                open={isAuthorImagePickerOpen}
                onOpenChange={setIsAuthorImagePickerOpen}
              >
                <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Select author image</DialogTitle>
                    <DialogDescription>
                      Choose an image from this website&apos;s media library.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[500px] overflow-y-auto pr-1">
                    {media.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {media.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setForm((current) => ({
                                ...current,
                                avatarImageId: item.id,
                              }))
                              setIsAuthorImagePickerOpen(false)
                            }}
                            className={`flex items-center gap-3 rounded-[3px] border p-2 text-left hover:border-[#3858e9] ${
                              form.avatarImageId === item.id
                                ? 'border-[#3858e9] bg-[#f0f3ff]'
                                : 'border-[#dcdcde] bg-white'
                            }`}
                          >
                            <img
                              src={item.publicUrl}
                              alt={item.altText || item.originalFilename}
                              className="h-14 w-14 rounded-[3px] object-cover"
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-[#1f2330]">
                                {item.altText || item.originalFilename}
                              </span>
                              <span className="block text-[12px] font-normal text-[#3858e9]">
                                Select
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px] font-normal text-[#50575e]">
                        Upload media first, then choose an author image.
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
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

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving || !form.name}
              className="rounded-[3px] bg-[#3858e9] px-4 py-2 font-semibold text-white transition hover:bg-[#2944c9] disabled:cursor-not-allowed disabled:bg-[#a7b0f7]"
            >
              {editingAuthorId ? 'Save author' : 'Add Author'}
            </button>
            {editingAuthorId ? (
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-[3px] border border-[#8c8f94] bg-white px-4 py-2 font-semibold text-[#1f2330] hover:border-[#1f2330]"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="min-w-0 space-y-3">
          <form
            onSubmit={submitSearch}
            className="flex flex-wrap items-center justify-end gap-2"
          >
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
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
            <div />
            <p className="text-[0.85rem] text-[#1f2330]">
              {filteredAuthors.length} {filteredAuthors.length === 1 ? 'item' : 'items'}
            </p>
          </div>

          <div className="overflow-x-auto border border-[#c3c4c7] bg-white">
            <table className="w-full min-w-[58rem] text-left text-[#1f2330]">
              <thead>
                <tr className="border-b border-[#c3c4c7] bg-white text-[#3858e9]">
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
                  const avatarImage = getAvatarImage(author)
                  const bio = author.bio || '-'
                  const count = countsFailed ? '-' : postCounts[author.id] || 0

                  return (
                    <tr
                      key={author.id}
                      className="border-b border-[#c3c4c7] bg-white align-top odd:bg-[#f6f7f7]"
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-start gap-3">
                          <AuthorAvatarPreview
                            image={avatarImage}
                            label={`${author.name} author image`}
                          />
                          <div className="min-w-0 space-y-1">
                            <p className="font-normal text-[#1f2330]">{author.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[#1f2330]">{bio}</td>
                      <td className="px-3 py-3 text-[#1f2330]">{author.slug}</td>
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
                        <div className="flex flex-wrap gap-x-2 gap-y-1 text-[0.84rem]">
                          <button
                            type="button"
                            onClick={() => startEditing(author)}
                            className="font-medium text-[#3858e9] hover:underline"
                          >
                            Edit
                          </button>
                          <span className="text-[#8c8f94]">|</span>
                          <button
                            type="button"
                            onClick={() => deleteAuthor(author.id)}
                            className="font-medium text-red-700 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredAuthors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-[#596171]">
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
