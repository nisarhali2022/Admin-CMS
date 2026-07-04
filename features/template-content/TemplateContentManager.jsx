'use client'

import { useEffect, useMemo, useState } from 'react'

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
    <section className="mt-8 border-t border-slate-200 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Pages
          </p>
          <h3 className="mt-1 text-xl font-bold">Template content</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            loadTemplates()
            loadMedia()
          }}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Refresh templates'}
        </button>
      </div>

      {message ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {message}
        </p>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-3">
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
          <div className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => selectTemplate(template)}
                className={`w-full rounded-lg border px-3 py-3 text-left ${
                  template.id === selectedId
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <span className="block font-semibold">{template.title}</span>
                <span className="mt-1 block text-sm opacity-75">
                  {template.templateKey} · {template.status}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_20rem]">
          <form
            onSubmit={saveTemplate}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
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

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
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
                  <button
                    type="button"
                    onClick={() => action('publish')}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"
                  >
                    Publish
                  </button>
                  <button
                    type="button"
                    onClick={() => action('unpublish')}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"
                  >
                    Unpublish
                  </button>
                  {selectedTemplate?.deletedAt ? (
                    <>
                      <button
                        type="button"
                        onClick={() => action('restore')}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => action('', 'DELETE')}
                        className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => action('trash')}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"
                    >
                      Trash
                    </button>
                  )}
                </>
              ) : null}
            </div>
          </form>

          <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Admin preview
            </p>
            <h4 className="mt-2 text-xl font-bold">{form.title || 'Untitled'}</h4>
            <p className="mt-1 text-sm text-slate-500">{form.path}</p>
            <pre className="mt-4 max-h-96 overflow-auto rounded-md bg-white p-3 text-xs text-slate-700">
              {parsedPreview.error
                ? parsedPreview.error
                : JSON.stringify(parsedPreview.parsed, null, 2)}
            </pre>
          </aside>
        </div>
      </div>
    </section>
  )
}
