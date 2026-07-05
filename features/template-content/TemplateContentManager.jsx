'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  AdminPanel,
  MessageAlert,
  PageHeader,
  StatusBadge,
} from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'

const templateOptions = {
  home: {
    label: 'Home',
    defaultPath: '/',
    defaultTitle: 'Home',
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
    contentData: { bodyText: '' },
  },
  terms: {
    label: 'Terms',
    defaultPath: '/terms',
    defaultTitle: 'Terms And Conditions',
    contentData: { bodyText: '' },
  },
  packages: {
    label: 'Packages',
    defaultPath: '/packages',
    defaultTitle: 'Packages',
    contentData: {
      introTitle: '',
      introText: '',
      mainImage: { mediaId: null },
    },
  },
}

const emptySeo = {
  seoTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  robotsMeta: '',
  ogImageId: '',
}

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
}

function getDefaultForm(templateKey = 'home') {
  const template = templateOptions[templateKey]

  return {
    templateKey,
    path: template.defaultPath,
    title: template.defaultTitle,
    contentDataText: JSON.stringify(template.contentData, null, 2),
    sitemapInclude: true,
    status: 'draft',
    ...emptySeo,
  }
}

function toForm(template) {
  return {
    templateKey: template.templateKey,
    path: template.path,
    title: template.title,
    contentDataText: JSON.stringify(template.contentData || {}, null, 2),
    seoTitle: template.seoTitle || '',
    metaDescription: template.metaDescription || '',
    canonicalUrl: template.canonicalUrl || '',
    robotsMeta: template.robotsMeta || '',
    ogImageId: template.ogImageId || '',
    sitemapInclude: Boolean(template.sitemapInclude),
    status: template.status || 'draft',
  }
}

function parseContentData(text) {
  try {
    const parsed = JSON.parse(text || '{}')
    return { parsed }
  } catch {
    return { error: 'Content data must be valid JSON.' }
  }
}

export default function TemplateContentManager({ websiteId }) {
  const [templates, setTemplates] = useState([])
  const [media, setMedia] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(getDefaultForm())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedId) || null,
    [selectedId, templates]
  )
  const parsedPreview = parseContentData(form.contentDataText)

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
        setMessage(getApiMessage(result, 'Unable to load template content.'))
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

  useEffect(() => {
    loadTemplates()
    loadMedia()
  }, [websiteId])

  function selectTemplate(template) {
    setSelectedId(template.id)
    setForm(toForm(template))
    setMessage('')
  }

  function resetForTemplate(templateKey) {
    setSelectedId(null)
    setForm(getDefaultForm(templateKey))
  }

  function buildPayload() {
    const { parsed, error } = parseContentData(form.contentDataText)
    if (error) return { error }

    return {
      payload: {
        templateKey: form.templateKey,
        path: form.path,
        title: form.title,
        contentData: parsed,
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

  async function saveTemplate(event) {
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
        ? `/api/cms/template-content/${selectedId}?websiteId=${websiteId}`
        : `/api/cms/template-content?websiteId=${websiteId}`
      const response = await fetch(url, {
        method: selectedId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to save template content.'))
        return
      }

      await loadTemplates()
      setSelectedId(result.template.id)
      setForm(toForm(result.template))
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
        setMessage(getApiMessage(result, 'Unable to update template content.'))
        return
      }

      await loadTemplates()
      if (result.template) setForm(toForm(result.template))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Pages"
        title="Template content"
        description="Edit fixed public page-template fields, SEO metadata, image references, sitemap inclusion, and publish state."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              loadTemplates()
              loadMedia()
            }}
            disabled={loading}
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        }
      />

      <MessageAlert message={message} />

      <div className="mt-5 grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <AdminPanel
          title="Templates"
          description="Select a fixed page template."
          contentClassName="space-y-3"
        >
          <select
            value={form.templateKey}
            onChange={(event) => resetForTemplate(event.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          >
            {Object.entries(templateOptions).map(([key, template]) => (
              <option key={key} value={key}>
                {template.label}
              </option>
            ))}
          </select>
          <div className="-mx-4 divide-y divide-[#dcdcde] border-t border-[#dcdcde]">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => selectTemplate(template)}
                className={`w-full px-4 py-3 text-left transition ${
                  template.id === selectedId
                    ? 'bg-[#f0f6fc] shadow-[inset_3px_0_0_#2271b1]'
                    : 'bg-white hover:bg-[#f6f7f7]'
                }`}
              >
                <span className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-[#2271b1]">
                    {template.title}
                  </span>
                  <StatusBadge active={template.status === 'published'}>
                    {template.status}
                  </StatusBadge>
                </span>
                <span className="mt-1 block truncate text-xs text-[#646970]">
                  {template.templateKey} - {template.path}
                </span>
              </button>
            ))}
          </div>
        </AdminPanel>

        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_20rem]">
          <form
            onSubmit={saveTemplate}
            className="border border-[#c3c4c7] bg-white p-4"
          >
            <div className="-mx-4 -mt-4 mb-4 border-b border-[#dcdcde] bg-[#f6f7f7] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#1d2327]">
                {selectedId ? 'Edit template content' : 'Add template content'}
              </h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Title
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Path
                <input
                  type="text"
                  value={form.path}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, path: event.target.value }))
                  }
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Status
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, status: event.target.value }))
                  }
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="unpublished">Unpublished</option>
                </select>
              </label>
              <label className="flex items-center gap-3 pt-7 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.sitemapInclude}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sitemapInclude: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Include in sitemap
              </label>
            </div>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Content data
              <textarea
                value={form.contentDataText}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contentDataText: event.target.value,
                  }))
                }
                rows={12}
                className="mt-2 w-full rounded-md border border-slate-300 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
              />
            </label>

            <div className="mt-4 border border-[#dcdcde] bg-[#f6f7f7] p-3">
              <p className="text-sm font-semibold text-slate-700">Media IDs</p>
              <div className="mt-2 grid gap-2 text-xs text-slate-600">
                {media.length === 0 ? <span>No uploaded media yet.</span> : null}
                {media.map((item) => (
                  <code key={item.id} className="rounded bg-white px-2 py-1">
                    {item.originalFilename}: {"{"}"mediaId":"{item.id}"{"}"}
                  </code>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input
                type="text"
                value={form.seoTitle}
                onChange={(event) =>
                  setForm((current) => ({ ...current, seoTitle: event.target.value }))
                }
                placeholder="SEO title"
                className="rounded-md border border-slate-300 px-3 py-2"
              />
              <input
                type="text"
                value={form.metaDescription}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    metaDescription: event.target.value,
                  }))
                }
                placeholder="Meta description"
                className="rounded-md border border-slate-300 px-3 py-2"
              />
              <input
                type="text"
                value={form.canonicalUrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    canonicalUrl: event.target.value,
                  }))
                }
                placeholder="Canonical URL"
                className="rounded-md border border-slate-300 px-3 py-2"
              />
              <select
                value={form.robotsMeta}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    robotsMeta: event.target.value,
                  }))
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
                onChange={(event) =>
                  setForm((current) => ({ ...current, ogImageId: event.target.value }))
                }
                className="rounded-md border border-slate-300 px-3 py-2 md:col-span-2"
              >
                <option value="">No OG image</option>
                {media.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.altText || item.originalFilename}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#dcdcde] pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              {selectedId ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => action('publish')}
                  >
                    Publish
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => action('unpublish')}
                  >
                    Unpublish
                  </Button>
                  {selectedTemplate?.deletedAt ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => action('restore')}
                      >
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => action('trash')}
                    >
                      Trash
                    </Button>
                  )}
                </>
              ) : null}
            </div>
          </form>

          <aside className="border border-[#c3c4c7] bg-white">
            <div className="border-b border-[#dcdcde] bg-[#f6f7f7] px-4 py-3">
              <p className="text-sm font-semibold text-[#1d2327]">Admin preview</p>
            </div>
            <div className="p-4">
              <h4 className="text-xl font-bold">{form.title || 'Untitled'}</h4>
              <p className="mt-1 text-sm text-slate-500">{form.path}</p>
              <pre className="mt-4 max-h-96 overflow-auto border border-[#dcdcde] bg-[#f6f7f7] p-3 text-xs text-slate-700">
                {parsedPreview.error
                  ? parsedPreview.error
                  : JSON.stringify(parsedPreview.parsed, null, 2)}
              </pre>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
