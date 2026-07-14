'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Eye,
  RefreshCw,
} from 'lucide-react'
import { MessageAlert } from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import TiptapPageEditor from './TiptapPageEditor'

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
    page.focusKeyphrase,
    page.seoTitle,
    page.metaDescription,
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

export default function TemplateContentManager({ websiteId, selectedWebsite = null }) {
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
  const [mediaSearchQuery, setMediaSearchQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPageKeys, setSelectedPageKeys] = useState([])
  const [bulkAction, setBulkAction] = useState('')
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
        focusKeyphrase: template.focusKeyphrase || '',
        seoTitle: template.seoTitle || '',
        metaDescription: template.metaDescription || '',
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
        focusKeyphrase: page.focusKeyphrase || '',
        seoTitle: page.seoTitle || '',
        metaDescription: page.metaDescription || '',
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

  const selectedSavedPages = useMemo(() => {
    const selectedKeys = new Set(selectedPageKeys)
    return pageRows.filter((page) => page.id && selectedKeys.has(page.key))
  }, [pageRows, selectedPageKeys])

  const visibleSavedPageKeys = useMemo(
    () => filteredPages.filter((page) => page.id).map((page) => page.key),
    [filteredPages]
  )

  const allVisiblePagesSelected =
    visibleSavedPageKeys.length > 0 &&
    visibleSavedPageKeys.every((key) => selectedPageKeys.includes(key))

  useEffect(() => {
    if (screen !== 'add' && !form.authorId && firstActiveAuthorId) {
      setForm((current) => ({ ...current, authorId: firstActiveAuthorId }))
    }
  }, [firstActiveAuthorId, form.authorId, screen])

  useEffect(() => {
    const availableKeys = new Set(pageRows.filter((page) => page.id).map((page) => page.key))
    setSelectedPageKeys((current) => current.filter((key) => availableKeys.has(key)))
  }, [pageRows])

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
    const nextValue = sanitizeEditorHtml(value)
    const field = templateOptions[form.templateKey]?.primaryContentField

    setForm((current) => ({
      ...current,
      contentText: nextValue,
      contentData: field
        ? {
            ...current.contentData,
            [field]: nextValue,
          }
        : current.contentData,
    }))
  }

  function getPageViewUrl(path = form.path, title = form.title, templateKey = form.templateKey) {
    const domain = selectedWebsite?.primaryDomain
    if (!domain) return ''
    if (templateKey === 'custom' && !String(path || '').trim() && !String(title || '').trim()) {
      return ''
    }

    const normalizedPath = normalizeEditorPath(path, title, templateKey)
    if (templateKey === 'custom' && normalizedPath === '/') return ''
    const origin = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`
    return `${origin.replace(/\/$/, '')}${normalizedPath}`
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

  function validatePageForm() {
    if (!form.title.trim()) return 'Title is required.'
    if (!form.featuredImageId) return 'Feature Image is required.'
    if (!form.seoTitle.trim()) return 'SEO title is required.'
    if (!form.metaDescription.trim()) return 'Meta description is required.'
    if (!form.authorId) return 'Author is required.'

    const focusError = validateFocusKeyphraseInput(form.focusKeyphrase)
    if (focusError) return focusError

    const nextTitle = normalizeTitle(form.title)
    const duplicateTitle = pageRows.find((page) => {
      if (selectedId && page.id === selectedId && page.kind === selectedKind) return false
      return normalizeTitle(page.title) === nextTitle
    })

    if (duplicateTitle) return 'A page with this title already exists.'

    return ''
  }

  async function saveTemplate(event) {
    event.preventDefault()
    const isCustomPage = selectedKind === 'custom' || screen === 'add'
    const validationMessage = validatePageForm()
    if (validationMessage) {
      setMessage(validationMessage)
      return
    }
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

  function togglePageSelection(pageKey) {
    setSelectedPageKeys((current) =>
      current.includes(pageKey)
        ? current.filter((key) => key !== pageKey)
        : [...current, pageKey]
    )
  }

  function toggleVisiblePageSelection() {
    setSelectedPageKeys((current) => {
      if (allVisiblePagesSelected) {
        return current.filter((key) => !visibleSavedPageKeys.includes(key))
      }

      return Array.from(new Set([...current, ...visibleSavedPageKeys]))
    })
  }

  async function bulkDeletePages() {
    if (bulkAction !== 'delete') {
      setMessage('Choose a bulk action first.')
      return
    }

    if (selectedSavedPages.length === 0) {
      setMessage('Select at least one page.')
      return
    }

    if (
      !window.confirm(
        `Delete ${selectedSavedPages.length} selected page(s) permanently? This cannot be undone.`
      )
    ) {
      return
    }

    setSaving(true)
    setMessage('')

    let deletedCount = 0
    const failures = []

    try {
      for (const page of selectedSavedPages) {
        const endpoint =
          page.kind === 'custom'
            ? `/api/cms/pages/${page.id}?websiteId=${websiteId}`
            : `/api/cms/template-content/${page.id}?websiteId=${websiteId}`
        const response = await fetch(endpoint, { method: 'DELETE' })
        const result = await response.json().catch(() => ({}))

        if (response.ok) {
          deletedCount += 1
        } else {
          failures.push(getApiMessage(result, 'Unable to delete page.'))
        }
      }

      setSelectedPageKeys([])
      setBulkAction('')
      await loadTemplates()
      await loadPages()

      if (failures.length > 0) {
        setMessage(
          `${deletedCount} deleted. ${failures.length} could not be deleted. ${failures[0]}`
        )
      } else {
        setMessage(`${deletedCount} page(s) deleted.`)
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
            Pages
          </h2>
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
          <button
            type="button"
            onClick={addPage}
            className="rounded-[3px] border border-[#3858e9] bg-white px-3 py-1.5 text-[13px] font-medium text-[#3858e9] hover:bg-[#f0f3ff]"
          >
            Add Page
          </button>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-8 w-72 max-w-full rounded-[3px] border border-[#8c8f94] bg-white px-2 text-[13px] outline-none focus:border-[#3858e9] focus:ring-1 focus:ring-[#3858e9]"
            aria-label="Search pages"
            placeholder="Search pages"
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
            onClick={bulkDeletePages}
            disabled={saving}
            className="h-8 rounded-[3px] border border-[#3858e9] bg-white px-3 text-[13px] font-medium text-[#3858e9] hover:bg-[#f0f3ff] disabled:opacity-60"
          >
            Apply
          </button>
          <span className="ml-auto text-[#1f2330]">
            {filteredPages.length} {filteredPages.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="overflow-x-auto border border-[#c3c4c7] bg-white">
          <table className="w-full min-w-[68rem] text-left text-[13px] text-[#1f2330]">
            <thead>
              <tr className="border-b border-[#c3c4c7] bg-white text-[#3858e9]">
                <th className="w-10 px-3 py-2 font-medium">
                  <input
                    type="checkbox"
                    checked={allVisiblePagesSelected}
                    onChange={toggleVisiblePageSelection}
                    aria-label="Select all visible pages"
                  />
                </th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="w-56 px-3 py-2 font-medium">SEO title</th>
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
                    {page.id ? (
                      <input
                        type="checkbox"
                        checked={selectedPageKeys.includes(page.key)}
                        onChange={() => togglePageSelection(page.key)}
                        aria-label={`Select ${page.title}`}
                      />
                    ) : null}
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
                  <td className="break-words px-3 py-4 text-[#1f2330]">{page.seoTitle || '-'}</td>
                  <td className="px-3 py-4 text-[#005cbb]">{page.authorName}</td>
                  <td className="px-3 py-4">
                    <p className="text-[#50575e]">{formatDate(page.publishedAt || page.updatedAt)}</p>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-[0.84rem]">
                      {page.id ? (
                        <>
                          {getPageViewUrl(page.path, page.title, page.templateKey) ? (
                            <a
                              href={getPageViewUrl(page.path, page.title, page.templateKey)}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-[#005cbb] hover:underline"
                            >
                              View
                            </a>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => deletePage(page)}
                            className="font-medium text-red-700 hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className="text-[#50575e]">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-[#596171]">
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
          {getPageViewUrl() ? (
            <a
              href={getPageViewUrl()}
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
        {isAddingPage ? (
          <p className="text-[13px] text-[#50575e]">
            View opens the public URL. Save this page before expecting new content
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

        <TiptapPageEditor
          value={form.contentText}
          onChange={updateContentText}
          media={media}
          editorMode={editorMode}
          setEditorMode={setEditorMode}
          setMessage={setMessage}
          sanitizeHtml={sanitizeEditorHtml}
          sanitizeUrl={sanitizeUrl}
          wordCount={getTextWordCount(form.contentText)}
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
                    onClick={() => setIsFeatureImagePickerOpen(true)}
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
