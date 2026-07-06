'use client'

import { useEffect, useMemo, useState } from 'react'
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
  Undo2,
} from 'lucide-react'
import { MessageAlert } from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'

const templateOptions = {
  home: {
    label: 'Home',
    defaultPath: '/',
    defaultTitle: 'Home',
    primaryContentField: 'heroText',
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
  ogImageId: '',
}

const editorTools = [
  { label: 'Bold', icon: Bold },
  { label: 'Italic', icon: Italic },
  { label: 'Bulleted list', icon: List },
  { label: 'Numbered list', icon: ListOrdered },
  { label: 'Quote', icon: Quote },
  { label: 'Align left', icon: AlignLeft },
  { label: 'Align center', icon: AlignCenter },
  { label: 'Align right', icon: AlignRight },
  { label: 'Undo', icon: Undo2 },
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
    status: 'draft',
    ...emptySeo,
    authorId,
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
    ogImageId: template.ogImageId || '',
    sitemapInclude: Boolean(template.sitemapInclude),
    status: template.status || 'draft',
  }
}

function pageMatchesSearch(page, query) {
  if (!query) return true

  const haystack = [
    page.title,
    page.path,
    page.templateKey,
    page.status,
    page.authorName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query.toLowerCase())
}

function statusLabel(status, deletedAt) {
  if (deletedAt) return 'Trashed'
  if (status === 'published') return 'Published'
  if (status === 'unpublished') return 'Unpublished'
  return 'Draft'
}

export default function TemplateContentManager({ websiteId }) {
  const [templates, setTemplates] = useState([])
  const [media, setMedia] = useState([])
  const [authors, setAuthors] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(getDefaultForm())
  const [screen, setScreen] = useState('list')
  const [pageFilter, setPageFilter] = useState('all')
  const [bulkAction, setBulkAction] = useState('trash')
  const [selectedKeys, setSelectedKeys] = useState([])
  const [searchDraft, setSearchDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const firstActiveAuthorId = useMemo(
    () => authors.find((author) => author.isActive && !author.deletedAt)?.id || '',
    [authors]
  )

  const authorsById = useMemo(
    () => new Map(authors.map((author) => [author.id, author])),
    [authors]
  )

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedId) || null,
    [selectedId, templates]
  )

  const pageRows = useMemo(() => {
    const savedByKey = new Map(templates.map((template) => [template.templateKey, template]))

    return Object.entries(templateOptions).map(([templateKey, option]) => {
      const saved = savedByKey.get(templateKey)
      const author = saved?.authorId ? authorsById.get(saved.authorId) : null

      return {
        key: templateKey,
        id: saved?.id || null,
        templateKey,
        title: saved?.title || option.defaultTitle,
        path: saved?.path || option.defaultPath,
        status: saved?.status || 'draft',
        deletedAt: saved?.deletedAt || null,
        publishedAt: saved?.publishedAt || null,
        updatedAt: saved?.updatedAt || saved?.createdAt || null,
        authorName: author?.name || '-',
        saved,
      }
    })
  }, [authorsById, templates])

  const counts = useMemo(() => {
    const activeRows = pageRows.filter((page) => !page.deletedAt)

    return {
      all: activeRows.length,
      published: activeRows.filter((page) => page.status === 'published').length,
      trash: pageRows.filter((page) => page.deletedAt).length,
    }
  }, [pageRows])

  const filteredPages = useMemo(() => {
    return pageRows.filter((page) => {
      if (pageFilter === 'published' && (page.deletedAt || page.status !== 'published')) {
        return false
      }

      if (pageFilter === 'trash' && !page.deletedAt) return false
      if (pageFilter === 'all' && page.deletedAt) return false

      return pageMatchesSearch(page, searchQuery)
    })
  }, [pageFilter, pageRows, searchQuery])

  const allVisibleSelected =
    filteredPages.length > 0 &&
    filteredPages.every((page) => selectedKeys.includes(page.key))

  useEffect(() => {
    if (!form.authorId && firstActiveAuthorId) {
      setForm((current) => ({ ...current, authorId: firstActiveAuthorId }))
    }
  }, [firstActiveAuthorId, form.authorId])

  async function loadTemplates() {
    if (!websiteId) return
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/cms/template-content?websiteId=${websiteId}&includeTrashed=true`,
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
    loadMedia()
    loadAuthors()
  }, [websiteId])

  function openPage(page) {
    setSelectedId(page.id)
    setForm(
      page.saved
        ? toForm(page.saved, firstActiveAuthorId)
        : getDefaultForm(page.templateKey, firstActiveAuthorId)
    )
    setScreen('edit')
    setMessage('')
  }

  function addPage() {
    const firstMissing = pageRows.find((page) => !page.id) || pageRows[0]
    if (firstMissing) openPage(firstMissing)
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

  function buildPayload() {
    return {
      templateKey: form.templateKey,
      path: form.path,
      title: form.title,
      contentData: form.contentData,
      focusKeyphrase: form.focusKeyphrase || null,
      seoTitle: form.seoTitle || null,
      metaDescription: form.metaDescription || null,
      authorId: form.authorId || null,
      canonicalUrl: form.canonicalUrl || null,
      robotsMeta: form.robotsMeta || null,
      ogImageId: form.ogImageId || null,
      sitemapInclude: form.sitemapInclude,
      status: form.status,
    }
  }

  async function saveTemplate(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const url = selectedId
        ? `/api/cms/template-content/${selectedId}?websiteId=${websiteId}`
        : `/api/cms/template-content?websiteId=${websiteId}`
      const response = await fetch(url, {
        method: selectedId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to save page.'))
        return
      }

      await loadTemplates()
      setSelectedId(result.template.id)
      setForm(toForm(result.template, firstActiveAuthorId))
      setMessage('Page saved.')
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
        `/api/cms/template-content/${selectedId}${actionName ? `/${actionName}` : ''}?websiteId=${websiteId}`,
        { method }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to update page.'))
        return
      }

      await loadTemplates()
      if (result.template) setForm(toForm(result.template, firstActiveAuthorId))
      if (method === 'DELETE') {
        setScreen('list')
        setSelectedId(null)
      }
    } finally {
      setSaving(false)
    }
  }

  async function runBulkAction() {
    const selectedPages = pageRows.filter((page) => selectedKeys.includes(page.key) && page.id)
    if (selectedPages.length === 0) return

    setSaving(true)
    setMessage('')

    try {
      for (const page of selectedPages) {
        const response = await fetch(
          `/api/cms/template-content/${page.id}/${bulkAction}?websiteId=${websiteId}`,
          { method: 'POST' }
        )
        const result = await response.json().catch(() => ({}))

        if (!response.ok) {
          setMessage(getApiMessage(result, 'Unable to update selected pages.'))
          return
        }
      }

      setSelectedKeys([])
      await loadTemplates()
    } finally {
      setSaving(false)
    }
  }

  function submitSearch(event) {
    event.preventDefault()
    setSearchQuery(searchDraft.trim())
  }

  function toggleVisibleSelection(checked) {
    const visibleKeys = filteredPages.map((page) => page.key)

    setSelectedKeys((current) => {
      if (checked) return Array.from(new Set([...current, ...visibleKeys]))
      return current.filter((key) => !visibleKeys.includes(key))
    })
  }

  function togglePageSelection(key, checked) {
    setSelectedKeys((current) => {
      if (checked) return Array.from(new Set([...current, key]))
      return current.filter((item) => item !== key)
    })
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

        <div className="flex flex-wrap items-center gap-1 text-[13px]">
          <button
            type="button"
            onClick={() => setPageFilter('all')}
            className={pageFilter === 'all' ? 'text-[#1f2330]' : 'text-[#005cbb]'}
          >
            All ({counts.all})
          </button>
          <span className="text-[#8c8f94]">|</span>
          <button
            type="button"
            onClick={() => setPageFilter('published')}
            className={pageFilter === 'published' ? 'text-[#1f2330]' : 'text-[#005cbb]'}
          >
            Published ({counts.published})
          </button>
          <span className="text-[#8c8f94]">|</span>
          <button
            type="button"
            onClick={() => setPageFilter('trash')}
            className={pageFilter === 'trash' ? 'text-[#1f2330]' : 'text-[#005cbb]'}
          >
            Trash ({counts.trash})
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkAction}
              onChange={(event) => setBulkAction(event.target.value)}
              className="h-8 min-w-36 rounded-[3px] border border-[#8c8f94] bg-white px-2 text-[13px] outline-none"
              aria-label="Bulk action"
            >
              <option value="trash">Move to Trash</option>
              <option value="restore">Restore</option>
            </select>
            <button
              type="button"
              onClick={runBulkAction}
              disabled={saving || selectedKeys.length === 0}
              className="h-8 rounded-[3px] border border-[#3858e9] bg-white px-3 text-[13px] font-medium text-[#3858e9] hover:bg-[#f0f3ff] disabled:opacity-60"
            >
              Apply
            </button>
            <select
              className="h-8 min-w-36 rounded-[3px] border border-[#8c8f94] bg-white px-2 text-[13px] outline-none"
              defaultValue="all"
            >
              <option value="all">All dates</option>
            </select>
            <button
              type="button"
              className="h-8 rounded-[3px] border border-[#3858e9] bg-white px-3 text-[13px] font-medium text-[#3858e9] hover:bg-[#f0f3ff]"
            >
              Filter
            </button>
          </div>

          <form onSubmit={submitSearch} className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
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
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(event) => toggleVisibleSelection(event.target.checked)}
                    aria-label="Select all visible pages"
                  />
                </th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="w-48 px-3 py-2 font-medium">Author</th>
                <th className="w-52 px-3 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredPages.map((page) => (
                <tr
                  key={page.key}
                  className={
                    page.deletedAt
                      ? 'border-b border-[#c3c4c7] bg-amber-50 align-top'
                      : 'border-b border-[#c3c4c7] bg-white align-top odd:bg-[#f6f7f7]'
                  }
                >
                  <td className="px-3 py-4">
                    <input
                      type="checkbox"
                      checked={selectedKeys.includes(page.key)}
                      onChange={(event) =>
                        togglePageSelection(page.key, event.target.checked)
                      }
                      aria-label={`Select ${page.title}`}
                    />
                  </td>
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
                    <p>{statusLabel(page.status, page.deletedAt)}</p>
                    <p className="text-[#50575e]">{formatDate(page.publishedAt || page.updatedAt)}</p>
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
    return (
      <form onSubmit={saveTemplate} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[1.55rem] font-normal leading-tight text-[#1f2330]">
            Edit Page
          </h2>
          <button
            type="button"
            onClick={addPage}
            className="rounded-[3px] border border-[#3858e9] bg-white px-3 py-1.5 text-[13px] font-medium text-[#3858e9] hover:bg-[#f0f3ff]"
          >
            Add Page
          </button>
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
              className="inline-flex items-center gap-1 rounded-[3px] border border-[#3858e9] bg-white px-3 py-1.5 text-[13px] text-[#3858e9]"
            >
              <ImagePlus className="h-4 w-4" />
              Add Media
            </button>
            <div className="flex overflow-hidden rounded-t-[3px] border border-[#c3c4c7] bg-white">
              <button type="button" className="px-3 py-1.5 text-[13px] text-[#1f2330]">
                Visual
              </button>
              <button
                type="button"
                className="border-l border-[#c3c4c7] bg-[#f6f7f7] px-3 py-1.5 text-[13px] text-[#50575e]"
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
            {editorTools.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[3px] text-[#3c434a] hover:bg-[#f0f0f1]"
                aria-label={label}
                title={label}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          <textarea
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
                  .filter((author) => !author.deletedAt)
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
            Path
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
            Status
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value }))
              }
              className="mt-2 w-full rounded-[3px] border border-[#8c8f94] bg-white px-2 py-2 outline-none"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
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
          <label className="block text-[13px] font-medium text-[#1f2330]">
            Open Graph image
            <select
              value={form.ogImageId}
              onChange={(event) =>
                setForm((current) => ({ ...current, ogImageId: event.target.value }))
              }
              className="mt-2 w-full rounded-[3px] border border-[#8c8f94] bg-white px-2 py-2 outline-none"
            >
              <option value="">No OG image</option>
              {media.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.altText || item.originalFilename}
                </option>
              ))}
            </select>
          </label>
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
            <>
              <Button type="button" variant="outline" onClick={() => action('publish')}>
                Publish
              </Button>
              <Button type="button" variant="outline" onClick={() => action('unpublish')}>
                Unpublish
              </Button>
              {selectedTemplate?.deletedAt ? (
                <>
                  <Button type="button" variant="outline" onClick={() => action('restore')}>
                    Restore
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => action('', 'DELETE')}
                  >
                    Delete
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" onClick={() => action('trash')}>
                  Move to Trash
                </Button>
              )}
            </>
          ) : null}
        </div>
      </form>
    )
  }

  return (
    <section className="space-y-5">
      <MessageAlert message={message} />
      {screen === 'edit' ? editPage() : pageList()}
    </section>
  )
}
