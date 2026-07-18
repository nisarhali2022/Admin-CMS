'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Save } from 'lucide-react'
import {
  AdminPanel,
  Field,
  MessageAlert,
  PageHeader,
} from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

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

function getRevalidationFailureMessage(revalidation) {
  return revalidation?.reason
    ? `Settings saved, but revalidation failed: ${revalidation.reason}`
    : 'Settings saved, but revalidation failed. Verify the webhook URL and secret.'
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
          ? getRevalidationFailureMessage(result.revalidation)
          : 'Settings saved.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Website"
        title="Settings"
        description="Control SEO defaults, robots, sitemap, AdSense, and public cache refresh behavior for the selected website."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadSettings}
            disabled={loading}
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        }
      />

      <MessageAlert message={message} tone={message?.includes('saved') ? 'info' : 'error'} />

      <form onSubmit={saveSettings} className="max-w-6xl space-y-5">
        <AdminPanel
          title="SEO and site config"
          description="JSON settings used by public websites for defaults and site-level content."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="SEO defaults">
              <Textarea
                value={form.seoDefaultsText}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    seoDefaultsText: event.target.value,
                  }))
                }
                rows={10}
                className="min-h-56 font-mono text-sm"
              />
            </Field>
            <Field label="Site config">
              <Textarea
                value={form.siteConfigText}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    siteConfigText: event.target.value,
                  }))
                }
                rows={10}
                className="min-h-56 font-mono text-sm"
              />
            </Field>
          </div>
        </AdminPanel>

        <AdminPanel
          title="Robots and sitemap"
          description="Control crawler instructions and sitemap generation options."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Robots.txt">
              <Textarea
                value={form.robotsTxt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    robotsTxt: event.target.value,
                  }))
                }
                rows={10}
                className="min-h-56 font-mono text-sm"
              />
            </Field>
            <Field label="Sitemap settings">
              <Textarea
                value={form.sitemapSettingsText}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sitemapSettingsText: event.target.value,
                  }))
                }
                rows={10}
                className="min-h-56 font-mono text-sm"
              />
            </Field>
          </div>
        </AdminPanel>

        <AdminPanel
          title="AdSense"
          description="Website-level AdSense toggle and public ads.txt content."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.adsenseEnabled}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    adsenseEnabled: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-input"
              />
              Active
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.adsenseAutoAdsEnabled}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    adsenseAutoAdsEnabled: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-input"
              />
              Auto ads
            </label>
            <Field label="Publisher ID" className="lg:col-span-2">
              <Input
                type="text"
                value={form.adsensePublisherId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    adsensePublisherId: event.target.value,
                  }))
                }
                placeholder="ca-pub-..."
              />
            </Field>
            <Field label="ads.txt" className="lg:col-span-2">
              <Textarea
                value={form.adsenseAdsTxt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    adsenseAdsTxt: event.target.value,
                  }))
                }
                placeholder="google.com, pub-..., DIRECT, ..."
                rows={5}
                className="font-mono text-sm"
              />
            </Field>
          </div>
        </AdminPanel>

        <AdminPanel
          title="Revalidation webhook"
          description="Notify the public website when public-facing CMS data changes."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Webhook URL">
              <Input
                type="text"
                value={form.revalidationUrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    revalidationUrl: event.target.value,
                  }))
                }
                placeholder="https://site.com/api/revalidate"
              />
            </Field>
            <Field label="Webhook secret">
              <Input
                type="password"
                value={form.revalidationSecret}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    revalidationSecret: event.target.value,
                  }))
                }
                placeholder={
                  settings?.hasRevalidationSecret
                    ? 'Secret already saved'
                    : 'Webhook secret'
                }
              />
            </Field>
            <label className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.clearRevalidationSecret}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    clearRevalidationSecret: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-input"
              />
              Clear saved secret
            </label>
          </div>
        </AdminPanel>

        <div className="flex justify-start border-t border-border pt-4">
          <Button type="submit" disabled={saving}>
            <Save />
            {saving ? 'Saving...' : 'Save settings'}
          </Button>
        </div>
      </form>
    </section>
  )
}
