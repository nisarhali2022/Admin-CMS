'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Quote,
  RefreshCw,
  Search,
} from 'lucide-react'
import { MessageAlert } from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'

const templateOptions = {
  home: {
    label: 'Home',
    defaultPath: '/',
    defaultTitle: 'Home',
    primaryContentField: 'heroText',
    featuredImageField: 'heroImage',
    contentData: {
      heroTitle: '',
      heroText: '',
      ctaLabel: '',
      ctaHref: '',
      heroImage: { mediaId: null },
    },
  },
  about: {
    label: 'About',
    defaultPath: '/about',
    defaultTitle: 'About Us',
    primaryContentField: 'bodyText',
    featuredImageField: 'mainImage',
    contentData: {
      introTitle: '',
      introText: '',
      bodyText: '',
      mainImage: { mediaId: null },
    },
  },
  contact: {
    label: 'Contact',
    defaultPath: '/contact',
    defaultTitle: 'Contact',
    primaryContentField: 'contactIntro',
    contentData: {
      contactIntro: '',
      phone: '',
      email: '',
      address: '',
      mapUrl: '',
    },
  },
  privacy: {
    label: 'Privacy',
    defaultPath: '/privacy',
    defaultTitle: 'Privacy Policy',
    primaryContentField: 'bodyText',
    contentData: { bodyText: '' },
  },
  terms: {
    label: 'Terms',
    defaultPath: '/terms',
    defaultTitle: 'Terms And Conditions',
    primaryContentField: 'bodyText',
    contentData: { bodyText: '' },
  },
  packages: {
    label: 'Packages',
    defaultPath: '/packages',
    defaultTitle: 'Packages',
    primaryContentField: 'introText',
    featuredImageField: 'mainImage',
    contentData: {
      introTitle: '',
      introText: '',
      mainImage: { mediaId: null },
    },
  },
}

const emptySeo = {
  focusKeyphrase: '',
  seoTitle: '',
  metaDescription: '',
  authorId: '',
  canonicalUrl: '',
  robotsMeta: '',
  featuredImageId: '',
}

const editorTools = [
  { label: 'Bold', icon: Bold, before: '**', after: '**' },
  { label: 'Italic', icon: Italic, before: '_', after: '_' },
  { label: 'Bulleted list', icon: List, before: '- ', after: '' },
  { label: 'Numbered list', icon: ListOrdered, before: '1. ', after: '' },
  { label: 'Quote', icon: Quote, before: '> ', after: '' },
  { label: 'Align left', icon: AlignLeft, before: '<div style="text-align:left">', after: '</div>' },
  { label: 'Align center', icon: AlignCenter, before: '<div style="text-align:center">', after: '</div>' },
  { label: 'Align right', icon: AlignRight, before: '<div style="text-align:right">', after: '</div>' },
]

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
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

function getDefaultContentData(templateKey) {
  return structuredClone(templateOptions[templateKey]?.contentData || {})
}

function getPrimaryContent(templateKey, contentData) {
  const field = templateOptions[templateKey]?.primaryContentField
  return field ? contentData?.[field] || '' : ''
}

function getFeaturedImageId(templateKey, contentData, fallbackImageId = '') {
  const field = templateOptions[templateKey]?.featuredImageField
  return fallbackImageId || (field ? contentData?.[field]?.mediaId || '' : '')
}

function getDefaultForm(templateKey = 'home', authorId = '') {
  const template = templateOptions[templateKey]
  const contentData = getDefaultContentData(templateKey)

  return {
    templateKey,
    path: template.defaultPath,
    title: template.defaultTitle,
    contentData,
    contentText: getPrimaryContent(templateKey, contentData),
    sitemapInclude: true,
    ...emptySeo,
    authorId,
  }
}

function getEmptyCustomPageForm() {
  return {
    templateKey: 'custom',
    path: '',
    title: '',
    contentData: {},
    contentText: '',
    focusKeyphrase: '',
    seoTitle: '',
    metaDescription: '',
    authorId: '',
    canonicalUrl: '',
    robotsMeta: '',
    featuredImageId: '',
    sitemapInclude: true,
  }
}

function toForm(template, fallbackAuthorId = '') {
  const contentData = {
    ...getDefaultContentData(template.templateKey),
    ...(template.contentData || {}),
  }

  return {
    templateKey: template.templateKey,
    path: template.path,
    title: template.title,
    contentData,
    contentText: getPrimaryContent(template.templateKey, contentData),
    focusKeyphrase: template.focusKeyphrase || '',
    seoTitle: template.seoTitle || '',
    metaDescription: template.metaDescription || '',
    authorId: template.authorId || fallbackAuthorId,
    canonicalUrl: template.canonicalUrl || '',
    robotsMeta: template.robotsMeta || '',
    featuredImageId: getFeaturedImageId(
      template.templateKey,
      contentData,
      template.ogImageId || ''
    ),
    sitemapInclude: Boolean(template.sitemapInclude),
  }
}

function customPageToForm(page, fallbackAuthorId = '') {
  return {
    templateKey: 'custom',
    path: page.path,
    title: page.title,
    contentData: {},
    contentText: page.bodyText || '',
    focusKeyphrase: page.focusKeyphrase || '',
    seoTitle: page.seoTitle || '',
    metaDescription: page.metaDescription || '',
    authorId: page.authorId || fallbackAuthorId,
    canonicalUrl: page.canonicalUrl || '',
    robotsMeta: page.robotsMeta || '',
    featuredImageId: page.featuredImageId || '',
    sitemapInclude: Boolean(page.sitemapInclude),
  }
}

function pageMatchesSearch(page, query) {
  if (!query) return true

  const haystack = [
    page.title,
    page.path,
    page.templateKey,
    page.authorName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query.toLowerCase())
}

function normalizePagePath(value, templateKey) {
  const fallback = templateOptions[templateKey]?.defaultPath || '/'
  const path = typeof value === 'string' && value.trim() ? value.trim() : fallback

  return path
}

function normalizeEditorPath(value, title, templateKey) {
  if (templateKey !== 'custom') return normalizePagePath(value, templateKey)

  const raw = typeof value === 'string' ? value.trim() : ''
  const source =
    raw ||
    String(title || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

  return source.startsWith('/') ? source : `/${source}`
}

function getPageSaveMessage(result, fallback) {
  if (result?.code === 'DUPLICATE_TEMPLATE_CONTENT') {
    return 'This page already exists for this website. Refresh the page list and select it to edit.'
  }

  return getApiMessage(result, fallback)
}

export default function TemplateContentManager({ websiteId }) {
  const contentTextareaRef = useRef(null)
  const [templates, setTemplates] = useState([])
  const [customPages, setCustomPages] = useState([])
  const [media, setMedia] = useState([])
  const [authors, setAuthors] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedKind, setSelectedKind] = useState('template')
  const [form, setForm] = useState(getDefaultForm())
  const [screen, setScreen] = useState('list')
  const [editorMode, setEditorMode] = useState('visual')
  const [isFeatureImagePickerOpen, setIsFeatureImagePickerOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const firstActiveAuthorId = useMemo(
    () => authors.find((author) => author.isActive)?.id || '',
    [authors]
  )

  const authorsById = useMemo(
    () => new Map(authors.map((author) => [author.id, author])),
    [authors]
  )

  const selectedFeatureImage = useMemo(
    () => media.find((item) => item.id === form.featuredImageId) || null,
    [form.featuredImageId, media]
  )

  const pageRows = useMemo(() => {
    const templateRows = templates.map((template) => {
      const author = template.authorId ? authorsById.get(template.authorId) : null

      return {
        kind: 'template',
        key: `template:${template.id}`,
        id: template.id,
        templateKey: template.templateKey,
        title: template.title,
        path: template.path,
        publishedAt: template.publishedAt || null,
        updatedAt: template.updatedAt || template.createdAt || null,
        authorName: author?.name || '-',
        saved: template,
      }
    })

    const customRows = customPages.map((page) => {
      const author = page.authorId ? authorsById.get(page.authorId) : null

      return {
        kind: 'custom',
        key: `custom:${page.id}`,
        id: page.id,
        templateKey: 'custom',
        title: page.title,
        path: page.path,
        publishedAt: page.publishedAt || null,
        updatedAt: page.updatedAt || page.createdAt || null,
        authorName: author?.name || '-',
        saved: page,
      }
    })

    return [...templateRows, ...customRows]
  }, [authorsById, customPages, templates])

  const filteredPages = useMemo(() => {
    return pageRows.filter((page) => pageMatchesSearch(page, searchQuery))
  }, [pageRows, searchQuery])

  useEffect(() => {
    if (screen !== 'add' && !form.authorId && firstActiveAuthorId) {
      setForm((current) => ({ ...current, authorId: firstActiveAuthorId }))
    }
  }, [firstActiveAuthorId, form.authorId, screen])

  async function loadTemplates() {
    if (!websiteId) return
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/cms/template-content?websiteId=${websiteId}`,
        { cache: 'no-store' }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to load pages.'))
        return
      }

      setTemplates(result.templates || [])
    } finally {
      setLoading(false)
    }
  }

  async function loadPages() {
    if (!websiteId) return
    const response = await fetch(`/api/cms/pages?websiteId=${websiteId}`, {
      cache: 'no-store',
    })
    const result = await response.json().catch(() => ({}))

    if (response.ok) setCustomPages(result.pages || [])
  }

  async function loadMedia() {
    if (!websiteId) return
    const response = await fetch(`/api/cms/media?websiteId=${websiteId}`, {
      cache: 'no-store',
    })
    const result = await response.json().catch(() => ({}))

    if (response.ok) setMedia(result.media || [])
  }

  async function loadAuthors() {
    if (!websiteId) return
    const response = await fetch(`/api/cms/authors?websiteId=${websiteId}`, {
      cache: 'no-store',
    })
    const result = await response.json().catch(() => ({}))

    if (response.ok) setAuthors(result.authors || [])
  }

  useEffect(() => {
    loadTemplates()
    loadPages()
    loadMedia()
    loadAuthors()
  }, [websiteId])

  function openPage(page) {
    setSelectedId(page.id)
    setSelectedKind(page.kind)
    setForm(
      page.kind === 'custom'
        ? customPageToForm(page.saved, firstActiveAuthorId)
        : toForm(page.saved, firstActiveAuthorId)
    )
    setScreen('edit')
    setMessage('')
  }

  function addPage() {
    setSelectedId(null)
    setSelectedKind('custom')
    setForm(getEmptyCustomPageForm())
    setScreen('add')
    setMessage('')
  }

  function updateContentText(value) {
    const field = templateOptions[form.templateKey]?.primaryContentField

    setForm((current) => ({
      ...current,
      contentText: value,
      contentData: field
        ? {
            ...current.contentData,
            [field]: value,
          }
        : current.contentData,
    }))
  }

  function insertIntoContent(before, after = '') {
    const textarea = contentTextareaRef.current
    const start = textarea?.selectionStart ?? form.contentText.length
    const end = textarea?.selectionEnd ?? form.contentText.length
    const selected = form.contentText.slice(start, end)
    const nextText = `${form.contentText.slice(0, start)}${before}${selected}${after}${form.contentText.slice(end)}`

    updateContentText(nextText)

    requestAnimationFrame(() => {
      textarea?.focus()
      const cursor = start + before.length + selected.length + after.length
      textarea?.setSelectionRange(cursor, cursor)
    })
  }

  function addMediaToContent() {
    const item = media[0]

    if (!item) {
      setMessage('Upload media first, then use Add Media.')
      return
    }

    insertIntoContent(`![${item.altText || item.originalFilename || 'Image'}](${item.publicUrl})`)
  }

  function updateFeaturedImage(mediaId) {
    const field = templateOptions[form.templateKey]?.featuredImageField

    setForm((current) => ({
      ...current,
      featuredImageId: mediaId,
      contentData: field
        ? {
            ...current.contentData,
            [field]: {
              ...(current.contentData?.[field] || {}),
              mediaId: mediaId || null,
            },
          }
        : current.contentData,
    }))
  }

  function buildPayload() {
    return {
      templateKey: form.templateKey,
      path: normalizeEditorPath(form.path, form.title, form.templateKey),
      title: form.title,
      contentData: form.contentData,
      focusKeyphrase: form.focusKeyphrase || null,
      seoTitle: form.seoTitle || null,
      metaDescription: form.metaDescription || null,
      authorId: form.authorId || null,
      canonicalUrl: form.canonicalUrl || null,
      robotsMeta: form.robotsMeta || null,
      ogImageId: form.featuredImageId || null,
      sitemapInclude: form.sitemapInclude,
    }
  }

  function buildCustomPagePayload() {
    return {
      title: form.title,
      path: normalizeEditorPath(form.path, form.title, 'custom'),
      bodyText: form.contentText,
      focusKeyphrase: form.focusKeyphrase || null,
      seoTitle: form.seoTitle || null,
      metaDescription: form.metaDescription || null,
      authorId: form.authorId || null,
      canonicalUrl: form.canonicalUrl || null,
      robotsMeta: form.robotsMeta || null,
      featuredImageId: form.featuredImageId || null,
      sitemapInclude: form.sitemapInclude,
    }
  }

  async function saveTemplate(event) {
    event.preventDefault()
    const isCustomPage = selectedKind === 'custom' || screen === 'add'
    const nextPath = normalizeEditorPath(form.path, form.title, form.templateKey)

    if (isCustomPage && nextPath === '/') {
      setMessage('/ is reserved for the fixed Home page.')
      return
    }

    const existingTemplatePath = templates.find(
      (template) => template.path === nextPath
    )
    const existingCustomPath = customPages.find(
      (page) =>
        page.path === nextPath &&
        !(selectedKind === 'custom' && selectedId && page.id === selectedId)
    )

    if (
      existingCustomPath ||
      (existingTemplatePath && !(selectedKind === 'template' && existingTemplatePath.id === selectedId))
    ) {
      setMessage('That slug is already used by another page on this website.')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const url = isCustomPage
        ? selectedId
          ? `/api/cms/pages/${selectedId}?websiteId=${websiteId}`
          : `/api/cms/pages?websiteId=${websiteId}`
        : `/api/cms/template-content/${selectedId}?websiteId=${websiteId}`
      const response = await fetch(url, {
        method: selectedId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isCustomPage ? buildCustomPagePayload() : buildPayload()),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getPageSaveMessage(result, 'Unable to save page.'))
        return
      }

      await loadTemplates()
      await loadPages()
      const savedPage = isCustomPage ? result.page : result.template
      setSelectedId(savedPage.id)
      setSelectedKind(isCustomPage ? 'custom' : 'template')
      setForm(
        isCustomPage
          ? customPageToForm(savedPage, firstActiveAuthorId)
          : toForm(savedPage, firstActiveAuthorId)
      )
      setScreen('edit')
      setMessage('Page saved.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteSelectedPage() {
    if (!selectedId) return
    if (!window.confirm('Delete this page permanently? This cannot be undone.')) return

    setSaving(true)
    setMessage('')

    try {
      const endpoint =
        selectedKind === 'custom'
          ? `/api/cms/pages/${selectedId}?websiteId=${websiteId}`
          : `/api/cms/template-content/${selectedId}?websiteId=${websiteId}`
      const response = await fetch(endpoint, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to update page.'))
        return
      }

      await loadTemplates()
      await loadPages()
      if (result.template) setForm(toForm(result.template, firstActiveAuthorId))
      if (result.page) setForm(customPageToForm(result.page, firstActiveAuthorId))
      setScreen('list')
      setSelectedId(null)
      setMessage('Page deleted.')
    } finally {
      setSaving(false)
    }
  }

  async function deletePage(page) {
    if (!page.id) return
    if (!window.confirm('Delete this page permanently? This cannot be undone.')) return

    setSaving(true)
    setMessage('')

    try {
      const endpoint =
        page.kind === 'custom'
          ? `/api/cms/pages/${page.id}?websiteId=${websiteId}`
          : `/api/cms/template-content/${page.id}?websiteId=${websiteId}`
      const response = await fetch(endpoint, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to update page.'))
        return
      }

      await loadTemplates()
      await loadPages()
      setMessage('Page deleted.')
    } finally {
      setSaving(false)
    }
  }

  function submitSearch(event) {
    event.preventDefault()
    setSearchQuery(searchInput.trim())
  }

  function pageList() {
    return (
      <section className="category-taxonomy-screen space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[1.55rem] font-normal leading-tight text-[#1f2330]">
            Pages
          </h2>
          <button
            type="button"
            onClick={addPage}
            className="rounded-[3px] border border-[#3858e9] bg-white px-3 py-1.5 text-[13px] font-medium text-[#3858e9] hover:bg-[#f0f3ff]"
          >
            Add Page
          </button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              loadTemplates()
              loadPages()
              loadMedia()
              loadAuthors()
            }}
            disabled={loading}
            className="ml-auto"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-[#1f2330]">
            {filteredPages.length} {filteredPages.length === 1 ? 'item' : 'items'}
          </p>
          <form onSubmit={submitSearch} className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="h-8 w-72 max-w-full rounded-[3px] border border-[#8c8f94] bg-white px-2 text-[13px] outline-none focus:border-[#3858e9] focus:ring-1 focus:ring-[#3858e9]"
              aria-label="Search pages"
            />
            <button
              type="submit"
              className="h-8 rounded-[3px] border border-[#3858e9] bg-white px-3 text-[13px] font-medium text-[#3858e9] hover:bg-[#f0f3ff]"
            >
              <Search className="mr-1 inline h-3.5 w-3.5" />
              Search Pages
            </button>
          </form>
        </div>

        <div className="overflow-x-auto border border-[#c3c4c7] bg-white">
          <table className="w-full min-w-[60rem] text-left text-[13px] text-[#1f2330]">
            <thead>
              <tr className="border-b border-[#c3c4c7] bg-white text-[#3858e9]">
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="w-48 px-3 py-2 font-medium">Author</th>
                <th className="w-52 px-3 py-2 font-medium">Date</th>
                <th className="w-44 px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPages.map((page) => (
                <tr
                  key={page.key}
                  className={
                    'border-b border-[#c3c4c7] bg-white align-top odd:bg-[#f6f7f7]'
                  }
                >
                  <td className="px-3 py-4">
                    <button
                      type="button"
                      onClick={() => openPage(page)}
                      className="font-normal text-[#005cbb] hover:text-[#003f85] hover:underline"
                    >
                      {page.title}
                    </button>
                    {page.path === '/' ? (
                      <span className="text-[#50575e]"> - Front Page</span>
                    ) : null}
                    <p className="mt-1 text-[#50575e]">{page.path}</p>
                  </td>
                  <td className="px-3 py-4 text-[#005cbb]">{page.authorName}</td>
                  <td className="px-3 py-4">
                    <p className="text-[#50575e]">{formatDate(page.publishedAt || page.updatedAt)}</p>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-[0.84rem]">
                      {page.id ? (
                        <button
                          type="button"
                          onClick={() => deletePage(page)}
                          className="font-medium text-red-700 hover:underline"
                        >
                          Delete
                        </button>
                      ) : (
                        <span className="text-[#50575e]">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-[#596171]">
                    No pages found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <p className="text-right text-[13px] text-[#1f2330]">
          {filteredPages.length} {filteredPages.length === 1 ? 'item' : 'items'}
        </p>
      </section>
    )
  }

  function editPage() {
    const isAddingPage = screen === 'add'

    return (
      <form onSubmit={saveTemplate} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[1.55rem] font-normal leading-tight text-[#1f2330]">
            {isAddingPage ? 'Add Page' : 'Edit Page'}
          </h2>
          <button
            type="button"
            onClick={() => setScreen('list')}
            className="ml-auto rounded-[3px] border border-[#8c8f94] bg-white px-3 py-1.5 text-[13px] font-medium text-[#1f2330] hover:border-[#1f2330]"
          >
            Back to Pages
          </button>
        </div>

        <input
          type="text"
          value={form.title}
          onChange={(event) =>
            setForm((current) => ({ ...current, title: event.target.value }))
          }
          className="w-full rounded-[3px] border border-[#8c8f94] bg-white px-2 py-2 text-[1.35rem] outline-none focus:border-[#3858e9] focus:ring-1 focus:ring-[#3858e9]"
          aria-label="Page title"
        />

        <div className="flex flex-wrap items-center gap-2 px-2 text-[13px] text-[#1f2330]">
          <span>Permalink:</span>
          <span className="text-[#005cbb]">{form.path}</span>
          <button
            type="button"
            className="rounded-[3px] border border-[#3858e9] bg-white px-2 py-1 text-[13px] text-[#3858e9]"
          >
            Edit
          </button>
        </div>

        <div className="border border-[#c3c4c7] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#c3c4c7] bg-[#f6f7f7] px-2 py-2">
            <button
              type="button"
              onClick={addMediaToContent}
              className="inline-flex items-center gap-1 rounded-[3px] border border-[#3858e9] bg-white px-3 py-1.5 text-[13px] text-[#3858e9]"
            >
              <ImagePlus className="h-4 w-4" />
              Add Media
            </button>
            <div className="flex overflow-hidden rounded-t-[3px] border border-[#c3c4c7] bg-white">
              <button
                type="button"
                onClick={() => setEditorMode('visual')}
                className={`px-3 py-1.5 text-[13px] ${
                  editorMode === 'visual'
                    ? 'bg-white text-[#1f2330]'
                    : 'bg-[#f6f7f7] text-[#50575e]'
                }`}
              >
                Visual
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('code')}
                className={`border-l border-[#c3c4c7] px-3 py-1.5 text-[13px] ${
                  editorMode === 'code'
                    ? 'bg-white text-[#1f2330]'
                    : 'bg-[#f6f7f7] text-[#50575e]'
                }`}
              >
                Code
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 border-b border-[#dcdcde] bg-white px-2 py-2">
            <select
              className="h-8 rounded-[3px] border border-[#c3c4c7] bg-white px-2 text-[13px]"
              defaultValue="paragraph"
            >
              <option value="paragraph">Paragraph</option>
            </select>
            {editorTools.map(({ label, icon: Icon, before, after }) => (
              <button
                key={label}
                type="button"
                onClick={() => insertIntoContent(before, after)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[3px] text-[#3c434a] hover:bg-[#f0f0f1]"
                aria-label={label}
                title={label}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          <textarea
            ref={contentTextareaRef}
            value={form.contentText}
            onChange={(event) => updateContentText(event.target.value)}
            rows={16}
            className="min-h-[20rem] w-full resize-y border-0 bg-white px-3 py-3 text-[15px] leading-6 text-[#1f2330] outline-none"
            aria-label="Page content"
          />

          <div className="border-t border-[#dcdcde] bg-[#f6f7f7] px-3 py-2 text-[13px] text-[#50575e]">
            Word count: {form.contentText.trim() ? form.contentText.trim().split(/\s+/).length : 0}
          </div>
        </div>

        <div className="border border-[#c3c4c7] bg-white">
          <div className="border-b border-[#dcdcde] bg-[#f6f7f7] px-4 py-3">
            <h3 className="text-[1rem] font-semibold text-[#1f2330]">SEO</h3>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-2">
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
              />
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
            <label className="block text-[13px] font-medium text-[#1f2330] md:col-span-2">
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
                {authors
                  .map((author) => (
                    <option key={author.id} value={author.id}>
                      {author.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        </div>

        <div className="grid gap-4 border border-[#c3c4c7] bg-white p-4 md:grid-cols-2">
          <label className="block text-[13px] font-medium text-[#1f2330]">
            Slug
            <input
              type="text"
              value={form.path}
              onChange={(event) =>
                setForm((current) => ({ ...current, path: event.target.value }))
              }
              className="mt-2 w-full rounded-[3px] border border-[#8c8f94] bg-white px-2 py-2 outline-none"
            />
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
          <div className="block text-[13px] font-medium text-[#1f2330]">
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
                      {selectedFeatureImage.altText || selectedFeatureImage.originalFilename}
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
                  onClick={() => setIsFeatureImagePickerOpen((current) => !current)}
                  className="rounded-[3px] border border-[#3858e9] bg-white px-3 py-1.5 text-[13px] font-medium text-[#3858e9] hover:bg-[#f0f3ff]"
                >
                  {selectedFeatureImage ? 'Change feature image' : 'Set feature image'}
                </button>
                {form.featuredImageId ? (
                  <button
                    type="button"
                    onClick={() => updateFeaturedImage('')}
                    className="rounded-[3px] border border-[#8c8f94] bg-white px-3 py-1.5 text-[13px] font-medium text-[#1f2330] hover:border-[#1f2330]"
                  >
                    Remove feature image
                  </button>
                ) : null}
              </div>
              {isFeatureImagePickerOpen ? (
                <div className="mt-3 max-h-72 overflow-y-auto border border-[#c3c4c7] bg-white p-3">
                  {media.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {media.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            updateFeaturedImage(item.id)
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
                  ) : (
                    <p className="text-[13px] font-normal text-[#50575e]">
                      Upload media first, then choose a feature image.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
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

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          {selectedId ? (
            <Button type="button" variant="destructive" onClick={deleteSelectedPage}>
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
      {screen === 'edit' || screen === 'add' ? editPage() : pageList()}
    </section>
  )
}
