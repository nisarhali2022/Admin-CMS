'use client'

import { useEffect, useMemo, useState } from 'react'

const defaultBlocks = [
  { type: 'paragraph', text: '' },
  { type: 'heading', level: 2, text: '' },
  { type: 'image', mediaId: '', alt: '', caption: '' },
  { type: 'toc' },
  { type: 'faq', items: [{ question: '', answer: '' }] },
]

const emptyForm = {
  title: '',
  slug: '',
  excerpt: '',
  authorId: '',
  categoryId: '',
  featuredImageId: '',
  bodyBlocksText: JSON.stringify(defaultBlocks, null, 2),
  seoTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  robotsMeta: '',
  ogImageId: '',
  sitemapInclude: true,
  status: 'draft',
}

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
}

function toForm(post) {
  return {
    title: post.title || '',
    slug: post.slug || '',
    excerpt: post.excerpt || '',
    authorId: post.authorId || '',
    categoryId: post.categoryId || '',
    featuredImageId: post.featuredImageId || '',
    bodyBlocksText: JSON.stringify(post.bodyBlocks || [], null, 2),
    seoTitle: post.seoTitle || '',
    metaDescription: post.metaDescription || '',
    canonicalUrl: post.canonicalUrl || '',
    robotsMeta: post.robotsMeta || '',
    ogImageId: post.ogImageId || '',
    sitemapInclude: Boolean(post.sitemapInclude),
    status: post.status || 'draft',
  }
}

function parseBlocks(text) {
  try {
    const parsed = JSON.parse(text || '[]')
    if (!Array.isArray(parsed)) return { error: 'Body blocks must be an array.' }
    return { parsed }
  } catch {
    return { error: 'Body blocks must be valid JSON.' }
  }
}

function getFaqItems(blocks) {
  return blocks
    .filter((block) => block.type === 'faq' && Array.isArray(block.items))
    .flatMap((block) => block.items)
    .filter((item) => item?.question && item?.answer)
}

export default function PostsManager({ websiteId }) {
  const [posts, setPosts] = useState([])
  const [authors, setAuthors] = useState([])
  const [categories, setCategories] = useState([])
  const [media, setMedia] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedId) || null,
    [posts, selectedId]
  )
  const parsedBlocks = parseBlocks(form.bodyBlocksText)
  const faqItems = parsedBlocks.parsed ? getFaqItems(parsedBlocks.parsed) : []

  async function loadPosts() {
    if (!websiteId) return
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/cms/posts?websiteId=${websiteId}&includeTrashed=true`,
        { cache: 'no-store' }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to load posts.'))
        return
      }

      setPosts(result.posts || [])
    } finally {
      setLoading(false)
    }
  }

  async function loadOptions() {
    if (!websiteId) return

    const [authorsResponse, categoriesResponse, mediaResponse] = await Promise.all([
      fetch(`/api/cms/authors?websiteId=${websiteId}`, { cache: 'no-store' }),
      fetch(`/api/cms/categories?websiteId=${websiteId}`, { cache: 'no-store' }),
      fetch(`/api/cms/media?websiteId=${websiteId}`, { cache: 'no-store' }),
    ])
    const [authorsResult, categoriesResult, mediaResult] = await Promise.all([
      authorsResponse.json().catch(() => ({})),
      categoriesResponse.json().catch(() => ({})),
      mediaResponse.json().catch(() => ({})),
    ])

    if (authorsResponse.ok) {
      setAuthors((authorsResult.authors || []).filter((author) => author.isActive))
    }
    if (categoriesResponse.ok) setCategories(categoriesResult.categories || [])
    if (mediaResponse.ok) setMedia(mediaResult.media || [])
  }

  useEffect(() => {
    loadPosts()
    loadOptions()
  }, [websiteId])

  function selectPost(post) {
    setSelectedId(post.id)
    setForm(toForm(post))
    setMessage('')
  }

  function newPost() {
    setSelectedId(null)
    setForm(emptyForm)
    setMessage('')
  }

  function buildPayload() {
    const { parsed, error } = parseBlocks(form.bodyBlocksText)
    if (error) return { error }

    return {
      payload: {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt || null,
        authorId: form.authorId,
        categoryId: form.categoryId || null,
        featuredImageId: form.featuredImageId || null,
        bodyBlocks: parsed,
        seoTitle: form.seoTitle || null,
        metaDescription: form.metaDescription || null,
        canonicalUrl: form.canonicalUrl || null,
        robotsMeta: form.robotsMeta || null,
        ogImageId: form.ogImageId || null,
        sitemapInclude: form.sitemapInclude,
        status: form.status,
      },
    }
  }

  async function savePost(event) {
    event.preventDefault()
    const { payload, error } = buildPayload()
    if (error) {
      setMessage(error)
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const url = selectedId
        ? `/api/cms/posts/${selectedId}?websiteId=${websiteId}`
        : `/api/cms/posts?websiteId=${websiteId}`
      const response = await fetch(url, {
        method: selectedId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to save post.'))
        return
      }

      await loadPosts()
      setSelectedId(result.post.id)
      setForm(toForm(result.post))
    } finally {
      setSaving(false)
    }
  }

  async function action(actionName, method = 'POST') {
    if (!selectedId) return
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/cms/posts/${selectedId}${actionName ? `/${actionName}` : ''}?websiteId=${websiteId}`,
        { method }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to update post.'))
        return
      }

      await loadPosts()
      if (result.post) setForm(toForm(result.post))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-8 border-t border-slate-200 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Blog
          </p>
          <h3 className="mt-1 text-xl font-bold">Posts</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            loadPosts()
            loadOptions()
          }}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Refresh posts'}
        </button>
      </div>

      {message ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {message}
        </p>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-3">
          <button
            type="button"
            onClick={newPost}
            className="w-full rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white"
          >
            New post
          </button>
          {posts.map((post) => (
            <button
              key={post.id}
              type="button"
              onClick={() => selectPost(post)}
              className={`w-full rounded-lg border px-3 py-3 text-left ${
                post.id === selectedId
                  ? 'border-slate-950 bg-slate-950 text-white'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <span className="block font-semibold">{post.title}</span>
              <span className="mt-1 block text-sm opacity-75">
                {post.slug} - {post.status}
              </span>
            </button>
          ))}
        </aside>

        <form onSubmit={savePost} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Post title"
              className="rounded-md border border-slate-300 px-3 py-2"
            />
            <input
              type="text"
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              placeholder="Slug"
              className="rounded-md border border-slate-300 px-3 py-2"
            />
            <select
              value={form.authorId}
              onChange={(event) => setForm((current) => ({ ...current, authorId: event.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">Select author</option>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.name}
                </option>
              ))}
            </select>
            <select
              value={form.categoryId}
              onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={form.featuredImageId}
              onChange={(event) =>
                setForm((current) => ({ ...current, featuredImageId: event.target.value }))
              }
              className="rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">No featured image</option>
              {media.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.altText || item.originalFilename}
                </option>
              ))}
            </select>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
            </select>
          </div>

          <textarea
            value={form.excerpt}
            onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))}
            placeholder="Excerpt"
            rows={2}
            className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2"
          />

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Body blocks
            <textarea
              value={form.bodyBlocksText}
              onChange={(event) =>
                setForm((current) => ({ ...current, bodyBlocksText: event.target.value }))
              }
              rows={16}
              className="mt-2 w-full rounded-md border border-slate-300 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
            />
          </label>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-700">Media IDs</p>
            <div className="mt-2 grid gap-2 text-xs text-slate-600">
              {media.length === 0 ? <span>No uploaded media yet.</span> : null}
              {media.map((item) => (
                <code key={item.id} className="rounded bg-white px-2 py-1">
                  {`${item.originalFilename}: {"type":"image","mediaId":"${item.id}"}`}
                </code>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              type="text"
              value={form.seoTitle}
              onChange={(event) => setForm((current) => ({ ...current, seoTitle: event.target.value }))}
              placeholder="SEO title"
              className="rounded-md border border-slate-300 px-3 py-2"
            />
            <input
              type="text"
              value={form.metaDescription}
              onChange={(event) =>
                setForm((current) => ({ ...current, metaDescription: event.target.value }))
              }
              placeholder="Meta description"
              className="rounded-md border border-slate-300 px-3 py-2"
            />
            <input
              type="text"
              value={form.canonicalUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, canonicalUrl: event.target.value }))
              }
              placeholder="Canonical URL"
              className="rounded-md border border-slate-300 px-3 py-2"
            />
            <select
              value={form.robotsMeta}
              onChange={(event) =>
                setForm((current) => ({ ...current, robotsMeta: event.target.value }))
              }
              className="rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">Default robots</option>
              <option value="index,follow">index,follow</option>
              <option value="noindex,follow">noindex,follow</option>
              <option value="index,nofollow">index,nofollow</option>
              <option value="noindex,nofollow">noindex,nofollow</option>
            </select>
            <select
              value={form.ogImageId}
              onChange={(event) => setForm((current) => ({ ...current, ogImageId: event.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">No OG image</option>
              {media.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.altText || item.originalFilename}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.sitemapInclude}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sitemapInclude: event.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              Include in sitemap
            </label>
          </div>

          {faqItems.length > 0 ? (
            <div className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {faqItems.length} FAQ item(s) ready for FAQ schema.
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            {selectedId ? (
              <>
                <button type="button" onClick={() => action('publish')} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">
                  Publish
                </button>
                <button type="button" onClick={() => action('unpublish')} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">
                  Unpublish
                </button>
                {selectedPost?.deletedAt ? (
                  <>
                    <button type="button" onClick={() => action('restore')} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">
                      Restore
                    </button>
                    <button type="button" onClick={() => action('', 'DELETE')} className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">
                      Delete
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => action('trash')} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">
                    Trash
                  </button>
                )}
              </>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  )
}
