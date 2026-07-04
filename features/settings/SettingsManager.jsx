'use client'

import { useEffect, useState } from 'react'

const emptyForm = {
  robotsTxt: '',
  sitemapSettingsText: '{}',
  seoDefaultsText: '{}',
  siteConfigText: '{}',
  adsenseEnabled: false,
  adsensePublisherId: '',
  adsenseAutoAdsEnabled: true,
  adsenseAdsTxt: '',
  revalidationUrl: '',
  revalidationSecret: '',
  clearRevalidationSecret: false,
}

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
}

function stringifyJson(value) {
  return JSON.stringify(value || {}, null, 2)
}

function parseJsonObject(text, label) {
  try {
    const parsed = JSON.parse(text || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { error: `${label} must be a JSON object.` }
    }
    return { parsed }
  } catch {
    return { error: `${label} must be valid JSON.` }
  }
}

function toForm(settings) {
  return {
    robotsTxt: settings?.robotsTxt || '',
    sitemapSettingsText: stringifyJson(settings?.sitemapSettings),
    seoDefaultsText: stringifyJson(settings?.seoDefaults),
    siteConfigText: stringifyJson(settings?.siteConfig),
    adsenseEnabled: Boolean(settings?.adsenseSettings?.enabled),
    adsensePublisherId: settings?.adsenseSettings?.publisherId || '',
    adsenseAutoAdsEnabled:
      typeof settings?.adsenseSettings?.autoAdsEnabled === 'boolean'
        ? settings.adsenseSettings.autoAdsEnabled
        : true,
    adsenseAdsTxt: settings?.adsenseSettings?.adsTxt || '',
    revalidationUrl: settings?.revalidationUrl || '',
    revalidationSecret: '',
    clearRevalidationSecret: false,
  }
}

export default function SettingsManager({ websiteId }) {
  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function loadSettings() {
    if (!websiteId) return
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(`/api/cms/settings?websiteId=${websiteId}`, {
        cache: 'no-store',
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to load settings.'))
        return
      }

      setSettings(result.settings)
      setForm(toForm(result.settings))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [websiteId])

  function buildPayload() {
    const sitemap = parseJsonObject(form.sitemapSettingsText, 'Sitemap settings')
    if (sitemap.error) return { error: sitemap.error }
    const seo = parseJsonObject(form.seoDefaultsText, 'SEO defaults')
    if (seo.error) return { error: seo.error }
    const siteConfig = parseJsonObject(form.siteConfigText, 'Site config')
    if (siteConfig.error) return { error: siteConfig.error }

    return {
      payload: {
        robotsTxt: form.robotsTxt || null,
        sitemapSettings: sitemap.parsed,
        seoDefaults: seo.parsed,
        siteConfig: siteConfig.parsed,
        adsenseSettings: {
          enabled: form.adsenseEnabled,
          publisherId: form.adsensePublisherId || null,
          autoAdsEnabled: form.adsenseAutoAdsEnabled,
          adsTxt: form.adsenseAdsTxt || null,
        },
        revalidationUrl: form.revalidationUrl || null,
        ...(form.revalidationSecret
          ? { revalidationSecret: form.revalidationSecret }
          : {}),
        clearRevalidationSecret: form.clearRevalidationSecret,
      },
    }
  }

  async function saveSettings(event) {
    event.preventDefault()
    const { payload, error } = buildPayload()
    if (error) {
      setMessage(error)
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(`/api/cms/settings?websiteId=${websiteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to save settings.'))
        return
      }

      setSettings(result.settings)
      setForm(toForm(result.settings))
      setMessage(
        result.revalidation?.ok === false
          ? 'Settings saved, but revalidation failed.'
          : 'Settings saved.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-8 border-t border-slate-200 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Website
          </p>
          <h3 className="mt-1 text-xl font-bold">Settings</h3>
        </div>
        <button
          type="button"
          onClick={loadSettings}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Refresh settings'}
        </button>
      </div>

      {message ? (
        <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
          {message}
        </p>
      ) : null}

      <form onSubmit={saveSettings} className="mt-5 grid gap-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Robots.txt
            <textarea
              value={form.robotsTxt}
              onChange={(event) => setForm((current) => ({ ...current, robotsTxt: event.target.value }))}
              rows={6}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Sitemap settings
            <textarea
              value={form.sitemapSettingsText}
              onChange={(event) =>
                setForm((current) => ({ ...current, sitemapSettingsText: event.target.value }))
              }
              rows={6}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            SEO defaults
            <textarea
              value={form.seoDefaultsText}
              onChange={(event) =>
                setForm((current) => ({ ...current, seoDefaultsText: event.target.value }))
              }
              rows={6}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Site config
            <textarea
              value={form.siteConfigText}
              onChange={(event) =>
                setForm((current) => ({ ...current, siteConfigText: event.target.value }))
              }
              rows={6}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </label>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-base font-bold">AdSense</h4>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.adsenseEnabled}
                onChange={(event) =>
                  setForm((current) => ({ ...current, adsenseEnabled: event.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              Active
            </label>
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.adsenseAutoAdsEnabled}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    adsenseAutoAdsEnabled: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              Auto ads
            </label>
            <input
              type="text"
              value={form.adsensePublisherId}
              onChange={(event) =>
                setForm((current) => ({ ...current, adsensePublisherId: event.target.value }))
              }
              placeholder="ca-pub-..."
              className="rounded-md border border-slate-300 bg-white px-3 py-2 lg:col-span-2"
            />
            <textarea
              value={form.adsenseAdsTxt}
              onChange={(event) =>
                setForm((current) => ({ ...current, adsenseAdsTxt: event.target.value }))
              }
              placeholder="google.com, pub-..., DIRECT, ..."
              rows={3}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm lg:col-span-2"
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="text-base font-bold">Revalidation webhook</h4>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <input
              type="text"
              value={form.revalidationUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, revalidationUrl: event.target.value }))
              }
              placeholder="https://site.com/api/revalidate"
              className="rounded-md border border-slate-300 bg-white px-3 py-2"
            />
            <input
              type="password"
              value={form.revalidationSecret}
              onChange={(event) =>
                setForm((current) => ({ ...current, revalidationSecret: event.target.value }))
              }
              placeholder={
                settings?.hasRevalidationSecret ? 'Secret already saved' : 'Webhook secret'
              }
              className="rounded-md border border-slate-300 bg-white px-3 py-2"
            />
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.clearRevalidationSecret}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    clearRevalidationSecret: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              Clear saved secret
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
        >
          {saving ? 'Saving...' : 'Save settings'}
        </button>
      </form>
    </section>
  )
}
