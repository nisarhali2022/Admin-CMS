'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText, Image as ImageIcon, Newspaper, PieChart } from 'lucide-react'
import { EmptyState, LoadingState, MessageAlert, PageHeader } from '@/components/admin/admin-ui'

const emptyMetrics = {
  pages: 0,
  posts: 0,
  images: 0,
  imageBytes: 0,
}

const emptyStorageUsage = {
  bucket: 'cms-media',
  objectCount: 0,
  usedBytes: 0,
  quotaBytes: null,
  quotaConfigured: false,
  remainingBytes: null,
  overQuotaBytes: 0,
  usagePercent: null,
}

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
}

function formatFileSize(bytes) {
  const value = Number(bytes || 0)

  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export default function DashboardWorkspace({ websiteId, selectedWebsite }) {
  const [metrics, setMetrics] = useState(emptyMetrics)
  const [storageUsage, setStorageUsage] = useState(emptyStorageUsage)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!websiteId) {
      setMetrics(emptyMetrics)
      setStorageUsage(emptyStorageUsage)
      setMessage('')
      return
    }

    let active = true

    async function loadDashboardMetrics() {
      setLoading(true)
      setMessage('')

      try {
        const [customPages, templatePages, posts, media, sharedStorage] = await Promise.all([
          loadMetricEndpoint(`/api/cms/pages?websiteId=${websiteId}`, 'pages'),
          loadMetricEndpoint(`/api/cms/template-content?websiteId=${websiteId}`, 'templates'),
          loadMetricEndpoint(`/api/cms/posts?websiteId=${websiteId}`, 'posts'),
          loadMetricEndpoint(`/api/cms/media?websiteId=${websiteId}`, 'media'),
          loadMetricValueEndpoint('/api/cms/storage/usage', 'storage'),
        ])

        if (!active) return

        setMetrics({
          pages: customPages.length + templatePages.length,
          posts: posts.length,
          images: media.length,
          imageBytes: media.reduce(
            (total, item) => total + Number(item.fileSize || 0),
            0
          ),
        })
        setStorageUsage({
          ...emptyStorageUsage,
          ...sharedStorage,
        })
      } catch (error) {
        if (active) setMessage(error.message || 'Unable to load dashboard metrics.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDashboardMetrics()

    return () => {
      active = false
    }
  }, [websiteId])

  const chartItems = useMemo(
    () => [
      { label: 'Pages', value: metrics.pages, color: 'bg-[#673de6]' },
      { label: 'Posts', value: metrics.posts, color: 'bg-[#00b090]' },
      { label: 'Images', value: metrics.images, color: 'bg-[#ff7a59]' },
    ],
    [metrics.images, metrics.pages, metrics.posts]
  )
  const maxChartValue = Math.max(...chartItems.map((item) => item.value), 1)
  const metricCards = [
    {
      label: 'Pages',
      value: metrics.pages,
      detail: 'Template and custom pages',
      icon: FileText,
    },
    {
      label: 'Posts',
      value: metrics.posts,
      detail: 'Published blog posts',
      icon: Newspaper,
    },
    {
      label: 'Images',
      value: metrics.images,
      detail: 'Media library files',
      icon: ImageIcon,
    },
    {
      label: 'Image storage',
      value: formatFileSize(metrics.imageBytes),
      detail: 'Optimized media size',
      icon: PieChart,
    },
  ]
  const averageImageSize = metrics.images
    ? formatFileSize(metrics.imageBytes / metrics.images)
    : '0 B'
  const storagePercent = storageUsage.quotaConfigured
    ? Math.min(Math.max(Number(storageUsage.usagePercent || 0), 0), 100)
    : 0

  return (
    <section className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={
          selectedWebsite
            ? `Overview for ${selectedWebsite.name}.`
            : 'Select a website from the header dropdown to view CMS metrics.'
        }
      />

      {!websiteId ? (
        <EmptyState
          title="Select a website"
          description="Dashboard metrics are scoped to the website selected in the header."
        />
      ) : (
        <>
          <MessageAlert message={message} />
          {loading ? <LoadingState label="Loading dashboard metrics..." /> : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => {
              const Icon = card.icon

              return (
                <article
                  key={card.label}
                  className="rounded-2xl border border-[#e1e4ea] bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
                        {card.label}
                      </p>
                      <p className="mt-3 text-3xl font-bold text-[#1f2330]">
                        {card.value}
                      </p>
                    </div>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0ecff] text-[#673de6]">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-3 text-[0.9rem] text-[#596171]">{card.detail}</p>
                </article>
              )
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
            <section className="rounded-2xl border border-[#e1e4ea] bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#1f2330]">Content overview</h2>
                  <p className="text-[0.9rem] text-[#596171]">
                    Pages, posts, and media files for the selected website.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {chartItems.map((item) => {
                  const percent = Math.max((item.value / maxChartValue) * 100, item.value ? 8 : 0)

                  return (
                    <div key={item.label} className="grid gap-2 sm:grid-cols-[7rem_1fr_3rem] sm:items-center">
                      <p className="font-semibold text-[#1f2330]">{item.label}</p>
                      <div className="h-4 overflow-hidden rounded-full bg-[#eef0f4]">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="text-right font-semibold text-[#1f2330]">{item.value}</p>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-[#e1e4ea] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#1f2330]">Storage summary</h2>
              <p className="mt-2 text-[0.9rem] text-[#596171]">
                Total optimized image storage currently used by website media.
              </p>
              <div className="mt-6 rounded-2xl bg-[#f6f7fb] p-4">
                <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
                  Total image size
                </p>
                <p className="mt-2 text-3xl font-bold text-[#1f2330]">
                  {formatFileSize(metrics.imageBytes)}
                </p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[#673de6]"
                    style={{ width: metrics.imageBytes ? '100%' : '0%' }}
                  />
                </div>
                <p className="mt-3 text-[0.85rem] text-[#596171]">
                  Average image size: {averageImageSize}
                </p>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-[#e1e4ea] bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#1f2330]">CMS Storage</h2>
                <p className="text-[0.9rem] text-[#596171]">
                  Shared Supabase Storage usage for the {storageUsage.bucket} bucket across all websites.
                </p>
              </div>
              <span className="rounded-full border border-[#d9dce3] bg-[#f8f9fb] px-3 py-1 text-[0.82rem] font-semibold text-[#596171]">
                Estimated quota
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-[#f6f7fb] p-4">
                <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
                  Total media files
                </p>
                <p className="mt-2 text-2xl font-bold text-[#1f2330]">{storageUsage.objectCount}</p>
              </div>
              <div className="rounded-2xl bg-[#f6f7fb] p-4">
                <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
                  Used storage
                </p>
                <p className="mt-2 text-2xl font-bold text-[#1f2330]">
                  {formatFileSize(storageUsage.usedBytes)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f6f7fb] p-4">
                <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
                  Remaining storage
                </p>
                <p className="mt-2 text-2xl font-bold text-[#1f2330]">
                  {storageUsage.quotaConfigured
                    ? formatFileSize(storageUsage.remainingBytes)
                    : 'Quota not configured'}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-3 text-[0.85rem] font-semibold text-[#596171]">
                <span>
                  {storageUsage.quotaConfigured
                    ? `${storagePercent}% of configured quota used`
                    : 'Configure SUPABASE_STORAGE_QUOTA_BYTES to estimate remaining storage'}
                </span>
                {storageUsage.quotaConfigured ? (
                  <span>{formatFileSize(storageUsage.quotaBytes)} quota</span>
                ) : null}
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#eef0f4]">
                <div
                  className={`h-full rounded-full ${
                    storageUsage.overQuotaBytes > 0 ? 'bg-[#dc2626]' : 'bg-[#673de6]'
                  }`}
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              {storageUsage.overQuotaBytes > 0 ? (
                <p className="mt-3 text-[0.9rem] font-semibold text-[#b91c1c]">
                  Over quota by {formatFileSize(storageUsage.overQuotaBytes)}.
                </p>
              ) : null}
              <p className="mt-3 text-[0.85rem] text-[#596171]">
                Supabase applies storage quota at the organization level, so this dashboard uses your configured quota as an estimate.
              </p>
            </div>
          </section>
        </>
      )}
    </section>
  )
}

async function loadMetricEndpoint(url, key) {
  const response = await fetch(url, { cache: 'no-store' })
  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(getApiMessage(result, 'Unable to load dashboard metrics.'))
  }

  return result[key] || []
}

async function loadMetricValueEndpoint(url, key) {
  const response = await fetch(url, { cache: 'no-store' })
  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(getApiMessage(result, 'Unable to load dashboard metrics.'))
  }

  return result[key] || {}
}
