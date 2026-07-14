'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, RefreshCw } from 'lucide-react'
import { MessageAlert } from '@/components/admin/admin-ui'
import RichTextEditor from '@/components/admin/RichTextEditor'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const emptyForm = {
  title: '',
  slug: '',
  authorId: '',
  categoryId: '',
  featuredImageId: '',
  bodyHtml: '',
  focusKeyphrase: '',
  seoTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  robotsMeta: '',
  sitemapInclude: true,
}

const allowedEditorTags = new Set([
  'A',
  'B',
  'BLOCKQUOTE',
  'BR',
  'COL',
  'COLGROUP',
  'DIV',
  'EM',
  'H1',
  'H2',
  'H3',
  'H4',
  'I',
  'IFRAME',
  'IMG',
  'LI',
  'OL',
  'P',
  'STRONG',
  'TABLE',
  'TBODY',
  'TD',
  'TH',
  'THEAD',
  'TR',
  'UL',
])

const allowedEditorAttributes = {
  A: new Set(['href', 'target', 'rel']),
  IMG: new Set(['src', 'alt', 'data-media-id', 'width']),
  IFRAME: new Set([
    'src',
    'width',
    'height',
    'allow',
    'allowfullscreen',
    'frameborder',
    'loading',
    'title',
  ]),
  TD: new Set(['colspan', 'rowspan']),
  TH: new Set(['colspan', 'rowspan']),
  DIV: new Set(['style']),
  P: new Set(['style']),
  BLOCKQUOTE: new Set(['style']),
  H1: new Set(['style']),
  H2: new Set(['style']),
  H3: new Set(['style']),
  H4: new Set(['style']),
}

const MIN_EDITOR_IMAGE_WIDTH = 120
const MAX_EDITOR_IMAGE_WIDTH = 1200

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function sanitizeUrl(value) {
  const text = String(value || '').trim()
  if (
    text.startsWith('/') ||
    text.startsWith('#') ||
    /^https?:\/\//i.test(text) ||
    /^mailto:/i.test(text)
  ) {
    return text
  }

  return ''
}

function sanitizeStyle(value) {
  const text = String(value || '').toLowerCase()
  const match = text.match(/text-align\s*:\s*(left|center|right)/)
  return match ? `text-align: ${match[1]};` : ''
}

function sanitizeImageWidth(value) {
  const number = Number.parseInt(value, 10)
  if (!Number.isFinite(number) || number <= 0) return ''
  return String(Math.min(Math.max(number, MIN_EDITOR_IMAGE_WIDTH), MAX_EDITOR_IMAGE_WIDTH))
}

function sanitizeEditorHtml(html) {
  if (typeof window === 'undefined' || !window.DOMParser) {
    return String(html || '')
  }

  const documentHtml = new window.DOMParser().parseFromString(
    `<div>${html || ''}</div>`,
    'text/html'
  )

  function cleanNode(node) {
    if (node.nodeType === window.Node.TEXT_NODE) return

    if (node.nodeType !== window.Node.ELEMENT_NODE) {
      node.remove()
      return
    }

    const tagName = node.tagName

    if (!allowedEditorTags.has(tagName)) {
      const text = documentHtml.createTextNode(node.textContent || '')
      node.replaceWith(text)
      return
    }

    for (const attribute of [...node.attributes]) {
      const allowed = allowedEditorAttributes[tagName]
      if (!allowed?.has(attribute.name)) {
        node.removeAttribute(attribute.name)
      }
    }

    if (tagName === 'A') {
      const href = sanitizeUrl(node.getAttribute('href'))
      if (!href) {
        node.removeAttribute('href')
      } else {
        node.setAttribute('href', href)
        node.setAttribute('target', '_blank')
        node.setAttribute('rel', 'noreferrer')
      }
    }

    if (tagName === 'IMG') {
      const src = sanitizeUrl(node.getAttribute('src'))
      if (!src) {
        node.remove()
        return
      }
      node.setAttribute('src', src)
      node.setAttribute('alt', node.getAttribute('alt') || '')
      const mediaId = node.getAttribute('data-media-id')
      if (mediaId) node.setAttribute('data-media-id', mediaId)
      const width = sanitizeImageWidth(node.getAttribute('width'))
      if (width) {
        node.setAttribute('width', width)
      } else {
        node.removeAttribute('width')
      }
    }

    if (tagName === 'IFRAME') {
      const src = sanitizeUrl(node.getAttribute('src'))
      if (
        !src ||
        !/^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\//i.test(src)
      ) {
        node.remove()
        return
      }
      node.setAttribute('src', src)
      node.setAttribute('loading', 'lazy')
      node.setAttribute('title', node.getAttribute('title') || 'Embedded video')
      node.setAttribute(
        'allow',
        node.getAttribute('allow') ||
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
      )
    }

    if (node.hasAttribute('style')) {
      const style = sanitizeStyle(node.getAttribute('style'))
      if (style) node.setAttribute('style', style)
      else node.removeAttribute('style')
    }

    for (const child of [...node.childNodes]) {
      cleanNode(child)
    }
  }

  const root = documentHtml.body.firstElementChild
  for (const child of [...root.childNodes]) {
    cleanNode(child)
  }

  return root.innerHTML
}

function getTextWordCount(html) {
  if (!html) return 0
  const text = String(html).replace(/<[^>]*>/g, ' ').trim()
  return text ? text.split(/\s+/).length : 0
}

function blocksToEditorHtml(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) return ''

  return blocks
    .map((block) => {
      switch (block?.type) {
        case 'paragraph':
          return `<p>${escapeHtml(block.text)}</p>`
        case 'heading': {
          const level = [1, 2, 3, 4].includes(Number(block.level))
            ? Number(block.level)
            : 2
          return `<h${level}>${escapeHtml(block.text)}</h${level}>`
        }
        case 'list': {
          const tag = block.ordered ? 'ol' : 'ul'
          const items = Array.isArray(block.items)
            ? block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
            : ''
          return `<${tag}>${items}</${tag}>`
        }
        case 'quote':
          return `<blockquote>${escapeHtml(block.text)}</blockquote>`
        case 'image':
          return block.media?.url
            ? `<p><img src="${escapeHtml(block.media.url)}" alt="${escapeHtml(
                block.alt || block.media.alt || ''
              )}" data-media-id="${escapeHtml(block.mediaId || block.media.id || '')}"></p>`
            : ''
        case 'faq':
          return Array.isArray(block.items)
            ? block.items
                .map(
                  (item) =>
                    `<h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(
                      item.answer
                    )}</p>`
                )
                .join('')
            : ''
        default:
          return ''
      }
    })
    .join('')
}

function toForm(post) {
  return {
    title: post.title || '',
    slug: post.slug || '',
    authorId: post.authorId || '',
    categoryId: post.categoryId || '',
    featuredImageId: post.featuredImageId || '',
    bodyHtml: post.bodyHtml || blocksToEditorHtml(post.bodyBlocks),
    focusKeyphrase: post.focusKeyphrase || '',
    seoTitle: post.seoTitle || '',
    metaDescription: post.metaDescription || '',
    canonicalUrl: post.canonicalUrl || '',
    robotsMeta: post.robotsMeta || '',
    sitemapInclude: Boolean(post.sitemapInclude),
  }
}

function normalizeSlug(value, title) {
  const raw = typeof value === 'string' ? value.trim() : ''
  const source =
    raw ||
    String(title || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

  return source.replace(/^\//, '')
}

function getOptionalSlug(value, title) {
  const raw = typeof value === 'string' ? value.trim() : ''
  const source =
    raw ||
    String(title || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

  return source.replace(/^\//, '')
}

function postMatchesSearch(post, query, authorsById, categoriesById) {
  if (!query) return true

  const authorName = post.author?.name || authorsById.get(post.authorId)?.name
  const categoryName = post.category?.name || categoriesById.get(post.categoryId)?.name
  const haystack = [
    post.title,
    post.slug,
    post.focusKeyphrase,
    post.seoTitle,
    post.metaDescription,
    authorName,
    categoryName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query.toLowerCase())
}

function formatPostPath(categorySlug, postSlug) {
  if (!categorySlug || !postSlug) return ''
  return `/${categorySlug}/${postSlug}`
}

function normalizeTitle(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

function validateFocusKeyphraseInput(value) {
  const text = String(value || '').trim()
  if (!text) return ''

  const parts = text.split(',').map((part) => part.trim())
  if (parts.some((part) => !part)) return 'Focus keyphrase entries cannot be empty.'
  if (parts.length > 3) return 'Focus keyphrase supports up to 3 keywords.'
  if (parts.some((part) => part.length > 60)) {
    return 'Each focus keyphrase must be 60 characters or less.'
  }

  return ''
}

export default function PostsManager({ websiteId, selectedWebsite = null }) {
  const [posts, setPosts] = useState([])
  const [authors, setAuthors] = useState([])
  const [categories, setCategories] = useState([])
  const [media, setMedia] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [screen, setScreen] = useState('list')
  const [editorMode, setEditorMode] = useState('visual')
  const [isFeatureImagePickerOpen, setIsFeatureImagePickerOpen] = useState(false)
  const [mediaSearchQuery, setMediaSearchQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPostIds, setSelectedPostIds] = useState([])
  const [bulkAction, setBulkAction] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const authorsById = useMemo(
    () => new Map(authors.map((author) => [author.id, author])),
    [authors]
  )
  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  )
  const filteredPosts = useMemo(
    () =>
      posts.filter((post) =>
        postMatchesSearch(post, searchQuery, authorsById, categoriesById)
      ),
    [authorsById, categoriesById, posts, searchQuery]
  )
  const visiblePostIds = useMemo(
    () => filteredPosts.map((post) => post.id).filter(Boolean),
    [filteredPosts]
  )
  const selectedPosts = useMemo(
    () => posts.filter((post) => selectedPostIds.includes(post.id)),
    [posts, selectedPostIds]
  )
  const allVisiblePostsSelected =
    visiblePostIds.length > 0 &&
    visiblePostIds.every((postId) => selectedPostIds.includes(postId))

  const selectedFeatureImage = useMemo(
    () => media.find((item) => item.id === form.featuredImageId) || null,
    [form.featuredImageId, media]
  )

  const filteredMedia = useMemo(() => {
    const query = mediaSearchQuery.trim().toLowerCase()
    if (!query) return media
    return media.filter((item) =>
      [item.originalFilename, item.altText, item.caption, item.mimeType, item.storagePath]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }, [media, mediaSearchQuery])

  async function loadPosts() {
    if (!websiteId) return
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(`/api/cms/posts?websiteId=${websiteId}`, {
        cache: 'no-store',
      })
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

  function openPost(post) {
    setSelectedId(post.id)
    setForm(toForm(post))
    setScreen('edit')
    setMessage('')
  }

  function addPost() {
    setSelectedId(null)
    setForm(emptyForm)
    setScreen('add')
    setMessage('')
  }

  function updateBodyHtml(value) {
    setForm((current) => ({ ...current, bodyHtml: sanitizeEditorHtml(value) }))
  }

  function getCategorySlug(categoryId = form.categoryId, category = null) {
    return category?.slug || categoriesById.get(categoryId)?.slug || ''
  }

  function getPostPath({
    slug = form.slug,
    title = form.title,
    categoryId = form.categoryId,
    category = null,
  } = {}) {
    const normalizedSlug = getOptionalSlug(slug, title)
    const categorySlug = getOptionalSlug(getCategorySlug(categoryId, category))
    return formatPostPath(categorySlug, normalizedSlug)
  }

  function getPostViewUrl(args = {}) {
    const domain = selectedWebsite?.primaryDomain
    const path = getPostPath(args)
    if (!domain || !path) return ''

    const origin = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`
    return `${origin.replace(/\/$/, '')}${path}`
  }

  function buildPayload() {
    return {
      title: form.title,
      slug: normalizeSlug(form.slug, form.title),
      authorId: form.authorId,
      categoryId: form.categoryId || null,
      featuredImageId: form.featuredImageId || null,
      bodyHtml: form.bodyHtml,
      bodyBlocks: [],
      focusKeyphrase: form.focusKeyphrase || null,
      seoTitle: form.seoTitle || null,
      metaDescription: form.metaDescription || null,
      canonicalUrl: form.canonicalUrl || null,
      robotsMeta: form.robotsMeta || null,
      ogImageId: form.featuredImageId || null,
      sitemapInclude: form.sitemapInclude,
    }
  }

  function validateEditorForm() {
    if (!form.title.trim()) return 'Title is required.'
    if (!form.authorId) return 'Author is required.'
    if (!form.categoryId) return 'Category is required.'
    if (!form.featuredImageId) return 'Feature Image is required.'
    if (!form.seoTitle.trim()) return 'SEO title is required.'
    if (!form.metaDescription.trim()) return 'Meta description is required.'

    const focusError = validateFocusKeyphraseInput(form.focusKeyphrase)
    if (focusError) return focusError

    const nextTitle = normalizeTitle(form.title)
    const nextSlug = normalizeSlug(form.slug, form.title)
    const duplicatePost = posts.find((post) => {
      if (selectedId && post.id === selectedId) return false
      return normalizeTitle(post.title) === nextTitle
    })
    if (duplicatePost) return 'A post with this title already exists.'

    const duplicateCategoryUrl = posts.find((post) => {
      if (selectedId && post.id === selectedId) return false
      return post.categoryId === form.categoryId && post.slug === nextSlug
    })
    if (duplicateCategoryUrl) {
      return 'A post with this category and slug already exists.'
    }

    return ''
  }

  async function savePost(event) {
    event.preventDefault()
    const validationMessage = validateEditorForm()
    if (validationMessage) {
      setMessage(validationMessage)
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
        body: JSON.stringify(buildPayload()),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to save post.'))
        return
      }

      await loadPosts()
      setSelectedId(result.post.id)
      setForm(toForm(result.post))
      setScreen('edit')
      setMessage('Post saved.')
    } finally {
      setSaving(false)
    }
  }

  async function deletePost(postId = selectedId) {
    if (!postId) return
    if (!window.confirm('Delete this post permanently? This cannot be undone.')) return
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(`/api/cms/posts/${postId}?websiteId=${websiteId}`, {
        method: 'DELETE',
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to delete post.'))
        return
      }

      await loadPosts()
      setScreen('list')
      setSelectedId(null)
      setForm(emptyForm)
      setMessage('Post deleted.')
    } finally {
      setSaving(false)
    }
  }

  function togglePostSelection(postId) {
    setSelectedPostIds((current) =>
      current.includes(postId)
        ? current.filter((id) => id !== postId)
        : [...current, postId]
    )
  }

  function toggleVisiblePostSelection() {
    setSelectedPostIds((current) => {
      if (allVisiblePostsSelected) {
        return current.filter((id) => !visiblePostIds.includes(id))
      }

      return Array.from(new Set([...current, ...visiblePostIds]))
    })
  }

  async function bulkDeletePosts() {
    if (bulkAction !== 'delete') {
      setMessage('Choose a bulk action first.')
      return
    }

    if (selectedPosts.length === 0) {
      setMessage('Select at least one post.')
      return
    }

    if (
      !window.confirm(
        `Delete ${selectedPosts.length} selected post(s) permanently? This cannot be undone.`
      )
    ) {
      return
    }

    setSaving(true)
    setMessage('')

    let deletedCount = 0
    const failures = []

    try {
      for (const post of selectedPosts) {
        const response = await fetch(`/api/cms/posts/${post.id}?websiteId=${websiteId}`, {
          method: 'DELETE',
        })
        const result = await response.json().catch(() => ({}))

        if (response.ok) {
          deletedCount += 1
        } else {
          failures.push(getApiMessage(result, 'Unable to delete post.'))
        }
      }

      setSelectedPostIds([])
      setBulkAction('')
      await loadPosts()

      if (failures.length > 0) {
        setMessage(
          `${deletedCount} deleted. ${failures.length} could not be deleted. ${failures[0]}`
        )
      } else {
        setMessage(`${deletedCount} post(s) deleted.`)
      }
    } finally {
      setSaving(false)
    }
  }

  function pageList() {
    return (
      <section className="category-taxonomy-screen space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[1.55rem] font-normal leading-tight text-[#1f2330]">
            Posts
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              loadPosts()
              loadOptions()
            }}
            disabled={loading}
            className="ml-auto"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={addPost}
            className="rounded-[3px] border border-[#3858e9] bg-white px-3 py-1.5 text-[13px] font-medium text-[#3858e9] hover:bg-[#f0f3ff]"
          >
            Add Post
          </button>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-8 w-72 max-w-full rounded-[3px] border border-[#8c8f94] bg-white px-2 text-[13px] outline-none focus:border-[#3858e9] focus:ring-1 focus:ring-[#3858e9]"
            aria-label="Search posts"
            placeholder="Search posts"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#50575e]">
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
            onClick={bulkDeletePosts}
            disabled={saving}
            className="h-8 rounded-[3px] border border-[#3858e9] bg-white px-3 text-[13px] font-medium text-[#3858e9] hover:bg-[#f0f3ff] disabled:opacity-60"
          >
            Apply
          </button>
          <span className="ml-auto text-[#1f2330]">
            {filteredPosts.length} {filteredPosts.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="overflow-x-auto border border-[#c3c4c7] bg-white">
          <table className="w-full min-w-[84rem] text-left text-[13px] text-[#1f2330]">
            <thead>
              <tr className="border-b border-[#c3c4c7] bg-white text-[#3858e9]">
                <th className="w-10 px-3 py-2 font-medium">
                  <input
                    type="checkbox"
                    checked={allVisiblePostsSelected}
                    onChange={toggleVisiblePostSelection}
                    aria-label="Select all visible posts"
                  />
                </th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="w-56 px-3 py-2 font-medium">SEO title</th>
                <th className="w-48 px-3 py-2 font-medium">Author</th>
                <th className="w-48 px-3 py-2 font-medium">Category</th>
                <th className="w-52 px-3 py-2 font-medium">Date</th>
                <th className="w-44 px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map((post) => {
                const category = post.category || categoriesById.get(post.categoryId)
                const postPath = getPostPath({
                  slug: post.slug,
                  title: post.title,
                  categoryId: post.categoryId,
                  category,
                })
                const viewUrl = getPostViewUrl({
                  slug: post.slug,
                  title: post.title,
                  categoryId: post.categoryId,
                  category,
                })

                return (
                  <tr
                    key={post.id}
                    className="border-b border-[#c3c4c7] bg-white align-top odd:bg-[#f6f7f7]"
                  >
                    <td className="px-3 py-4">
                      <input
                        type="checkbox"
                        checked={selectedPostIds.includes(post.id)}
                        onChange={() => togglePostSelection(post.id)}
                        aria-label={`Select ${post.title || 'Untitled'}`}
                      />
                    </td>
                    <td className="px-3 py-4">
                      <button
                        type="button"
                        onClick={() => openPost(post)}
                        className="font-normal text-[#005cbb] hover:text-[#003f85] hover:underline"
                      >
                        {post.title || 'Untitled'}
                      </button>
                      <p className="mt-1 text-[#50575e]">
                        {postPath || 'Category and slug required'}
                      </p>
                    </td>
                    <td className="break-words px-3 py-4 text-[#1f2330]">{post.seoTitle || '-'}</td>
                    <td className="px-3 py-4 text-[#005cbb]">
                      {post.author?.name || authorsById.get(post.authorId)?.name || '-'}
                    </td>
                    <td className="px-3 py-4">{category?.name || '-'}</td>
                    <td className="px-3 py-4">
                      <p className="text-[#50575e]">
                        {formatDate(post.publishedAt || post.updatedAt)}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-x-2 gap-y-1 text-[0.84rem]">
                        {viewUrl ? (
                          <a
                            href={viewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-[#005cbb] hover:underline"
                          >
                            View
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => deletePost(post.id)}
                          className="font-medium text-red-700 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-[#596171]">
                    No posts found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  function editPost() {
    const isAddingPost = screen === 'add'

    return (
      <form onSubmit={savePost} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[1.55rem] font-normal leading-tight text-[#1f2330]">
            {isAddingPost ? 'Add Post' : 'Edit Post'}
          </h2>
          <button
            type="button"
            onClick={() => setScreen('list')}
            className="ml-auto rounded-[3px] border border-[#8c8f94] bg-white px-3 py-1.5 text-[13px] font-medium text-[#1f2330] hover:border-[#1f2330]"
          >
            Back to Posts
          </button>
          {getPostViewUrl() ? (
            <a
              href={getPostViewUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-[3px] border border-[#3858e9] bg-white px-3 py-1.5 text-[13px] font-medium text-[#3858e9] hover:bg-[#f0f3ff]"
            >
              <Eye className="h-4 w-4" />
              View
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-1 rounded-[3px] border border-[#c3c4c7] bg-[#f6f7f7] px-3 py-1.5 text-[13px] font-medium text-[#8c8f94]"
            >
              <Eye className="h-4 w-4" />
              View
            </button>
          )}
        </div>
        {isAddingPost ? (
          <p className="text-[13px] text-[#50575e]">
            View opens the public URL. Save this post before expecting new content
            to appear on the website.
          </p>
        ) : null}

        <input
          type="text"
          value={form.title}
          onChange={(event) =>
            setForm((current) => ({ ...current, title: event.target.value }))
          }
          className="w-full rounded-[3px] border border-[#8c8f94] bg-white px-2 py-2 text-[1.35rem] outline-none focus:border-[#3858e9] focus:ring-1 focus:ring-[#3858e9]"
          aria-label="Post title"
        />

        <div className="flex flex-wrap items-center gap-2 px-2 text-[13px] text-[#1f2330]">
          <span>Permalink:</span>
          <span className={getPostPath() ? 'text-[#005cbb]' : 'text-[#50575e]'}>
            {getPostViewUrl() ||
              getPostPath() ||
              'Select a category and enter a title/slug to generate the permalink.'}
          </span>
        </div>

        <RichTextEditor
          value={form.bodyHtml}
          onChange={updateBodyHtml}
          media={media}
          editorMode={editorMode}
          setEditorMode={setEditorMode}
          setMessage={setMessage}
          sanitizeHtml={sanitizeEditorHtml}
          sanitizeUrl={sanitizeUrl}
          wordCount={getTextWordCount(form.bodyHtml)}
          placeholder="Start writing post content..."
          codeLabel="HTML post content"
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="border border-[#c3c4c7] bg-white">
            <div className="border-b border-[#dcdcde] bg-[#f6f7f7] px-4 py-3">
              <h3 className="text-[1rem] font-semibold text-[#1f2330]">SEO</h3>
            </div>
            <div className="grid gap-4 p-4">
              <label className="block text-[13px] font-medium text-[#1f2330]">
                Focus keyphrase
                <input
                  type="text"
                  value={form.focusKeyphrase}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      focusKeyphrase: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-[3px] border border-[#8c8f94] bg-white px-2 py-2 outline-none"
                  placeholder="keyword one, keyword two"
                />
                <span className="mt-1 block text-[12px] font-normal text-[#50575e]">
                  Add 1 to 3 comma-separated keyphrases.
                </span>
              </label>
              <label className="block text-[13px] font-medium text-[#1f2330]">
                SEO title
                <input
                  type="text"
                  value={form.seoTitle}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, seoTitle: event.target.value }))
                  }
                  className="mt-2 w-full rounded-[3px] border border-[#8c8f94] bg-white px-2 py-2 outline-none"
                />
              </label>
              <label className="block text-[13px] font-medium text-[#1f2330]">
                Meta description
                <textarea
                  value={form.metaDescription}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      metaDescription: event.target.value,
                    }))
                  }
                  rows={4}
                  className="mt-2 w-full rounded-[3px] border border-[#8c8f94] bg-white px-2 py-2 outline-none"
                />
              </label>
            </div>
          </div>

          <div className="grid gap-4 border border-[#c3c4c7] bg-white p-4 md:grid-cols-2">
            <label className="block text-[13px] font-medium text-[#1f2330]">
              Author
              <select
                value={form.authorId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, authorId: event.target.value }))
                }
                className="mt-2 w-full rounded-[3px] border border-[#8c8f94] bg-white px-2 py-2 outline-none"
              >
                <option value="">Select author</option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[13px] font-medium text-[#1f2330]">
              Slug
              <input
                type="text"
                value={form.slug}
                onChange={(event) =>
                  setForm((current) => ({ ...current, slug: event.target.value }))
                }
                className="mt-2 w-full rounded-[3px] border border-[#8c8f94] bg-white px-2 py-2 outline-none"
              />
            </label>
            <label className="block text-[13px] font-medium text-[#1f2330]">
              Category
              <select
                value={form.categoryId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, categoryId: event.target.value }))
                }
                className="mt-2 w-full rounded-[3px] border border-[#8c8f94] bg-white px-2 py-2 outline-none"
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[13px] font-medium text-[#1f2330]">
              Canonical URL
              <input
                type="text"
                value={form.canonicalUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, canonicalUrl: event.target.value }))
                }
                className="mt-2 w-full rounded-[3px] border border-[#8c8f94] bg-white px-2 py-2 outline-none"
              />
            </label>
            <label className="block text-[13px] font-medium text-[#1f2330]">
              Robots meta
              <select
                value={form.robotsMeta}
                onChange={(event) =>
                  setForm((current) => ({ ...current, robotsMeta: event.target.value }))
                }
                className="mt-2 w-full rounded-[3px] border border-[#8c8f94] bg-white px-2 py-2 outline-none"
              >
                <option value="">Default robots</option>
                <option value="index,follow">index,follow</option>
                <option value="noindex,follow">noindex,follow</option>
                <option value="index,nofollow">index,nofollow</option>
                <option value="noindex,nofollow">noindex,nofollow</option>
              </select>
            </label>
            <div className="block text-[13px] font-medium text-[#1f2330] md:col-span-2">
              Feature Image
              <div className="mt-2 rounded-[3px] border border-[#c3c4c7] bg-[#f6f7f7] p-3">
                {selectedFeatureImage ? (
                  <div className="mb-3 flex items-center gap-3">
                    <img
                      src={selectedFeatureImage.publicUrl}
                      alt={selectedFeatureImage.altText || selectedFeatureImage.originalFilename}
                      className="h-16 w-16 rounded-[3px] border border-[#c3c4c7] object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#1f2330]">
                        {selectedFeatureImage.altText ||
                          selectedFeatureImage.originalFilename}
                      </p>
                      <p className="truncate text-[12px] font-normal text-[#50575e]">
                        {selectedFeatureImage.originalFilename}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mb-3 text-[13px] font-normal text-[#50575e]">
                    No feature image selected.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFeatureImagePickerOpen(true)}
                    className="rounded-[3px] border border-[#3858e9] bg-white px-3 py-1.5 text-[13px] font-medium text-[#3858e9] hover:bg-[#f0f3ff]"
                  >
                    {selectedFeatureImage ? 'Change feature image' : 'Set feature image'}
                  </button>
                  {form.featuredImageId ? (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({ ...current, featuredImageId: '' }))
                      }
                      className="rounded-[3px] border border-[#8c8f94] bg-white px-3 py-1.5 text-[13px] font-medium text-[#1f2330] hover:border-[#1f2330]"
                    >
                      Remove feature image
                    </button>
                  ) : null}
                </div>
              </div>
              <Dialog
                open={isFeatureImagePickerOpen}
                onOpenChange={setIsFeatureImagePickerOpen}
              >
                <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Select feature image</DialogTitle>
                    <DialogDescription>
                      Choose an image from this website&apos;s media library.
                    </DialogDescription>
                  </DialogHeader>
                  <input
                    type="search"
                    value={mediaSearchQuery}
                    onChange={(event) => setMediaSearchQuery(event.target.value)}
                    placeholder="Search images"
                    aria-label="Search feature images"
                    className="w-full rounded-[3px] border border-[#8c8f94] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#3858e9]"
                  />
                  <div className="max-h-[500px] overflow-y-auto pr-1">
                    {filteredMedia.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredMedia.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setForm((current) => ({
                                ...current,
                                featuredImageId: item.id,
                              }))
                              setIsFeatureImagePickerOpen(false)
                            }}
                            className={`flex items-center gap-3 rounded-[3px] border p-2 text-left hover:border-[#3858e9] ${
                              form.featuredImageId === item.id
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
                              <span className="block truncate text-[13px] font-medium text-[#1f2330]">
                                {item.altText || item.originalFilename}
                              </span>
                              <span className="block text-[12px] font-normal text-[#3858e9]">
                                Select
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : media.length > 0 ? (
                      <p className="text-[13px] font-normal text-[#50575e]">
                        No images match your search.
                      </p>
                    ) : (
                      <p className="text-[13px] font-normal text-[#50575e]">
                        Upload media first, then choose a feature image.
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <label className="flex items-center gap-3 pt-7 text-[13px] font-medium text-[#1f2330]">
              <input
                type="checkbox"
                checked={form.sitemapInclude}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sitemapInclude: event.target.checked,
                  }))
                }
              />
              Include in sitemap
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          {selectedId ? (
            <Button type="button" variant="destructive" onClick={() => deletePost()}>
              Delete
            </Button>
          ) : null}
        </div>
      </form>
    )
  }

  return (
    <section className="space-y-5">
      <MessageAlert message={message} />
      {screen === 'edit' || screen === 'add' ? editPost() : pageList()}
    </section>
  )
}
