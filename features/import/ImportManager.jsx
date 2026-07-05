'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { MessageAlert, PageHeader } from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'

const emptyForm = {
  wordpressBaseUrl: '',
  wordpressUsername: '',
  wordpressApplicationPassword: '',
  confirmInactiveImport: false,
}

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
}

function ImportProgress({ job, importing }) {
  const progress = job?.report?.progress || null
  const percent =
    typeof progress?.percent === 'number'
      ? Math.max(0, Math.min(100, progress.percent))
      : null
  const label = progress?.label || (importing ? 'Starting import' : 'Import progress')
  const status = job?.status || (importing ? 'running' : null)
  const showIndeterminate = importing && percent === null

  if (!importing && !progress) return null

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-sky-950">{label}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-sky-700">
            {status || 'import'}{progress?.phase ? ` - ${progress.phase}` : ''}
          </p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-sky-800 shadow-sm">
          {percent === null ? 'Working...' : `${percent}%`}
        </span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full border border-sky-200 bg-white">
        <div
          className={`h-full rounded-full bg-[#2271b1] transition-all ${
            showIndeterminate ? 'w-1/3 animate-pulse' : ''
          }`}
          style={showIndeterminate ? undefined : { width: `${percent ?? 0}%` }}
        />
      </div>
      {Number.isFinite(progress?.total) && progress.total > 0 ? (
        <p className="mt-2 text-xs text-sky-800">
          {progress.current} of {progress.total}
        </p>
      ) : null}
    </div>
  )
}

export default function ImportManager({ website }) {
  const websiteId = website?.id
  const [jobs, setJobs] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [confirmReset, setConfirmReset] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState('')
  const activeImportJob = useMemo(
    () =>
      jobs.find((job) => job.status === 'running' || job.status === 'queued') ||
      jobs[0] ||
      null,
    [jobs],
  )

  async function loadJobs({ silent = false } = {}) {
    if (!websiteId) return
    if (!silent) {
      setLoading(true)
      setMessage('')
    }

    try {
      const response = await fetch(`/api/cms/import?websiteId=${websiteId}`, {
        cache: 'no-store',
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to load import jobs.'))
        return
      }

      setJobs(result.jobs || [])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    loadJobs()
  }, [websiteId])

  useEffect(() => {
    if (!importing || !websiteId) return undefined

    loadJobs({ silent: true })
    const timer = window.setInterval(() => {
      loadJobs({ silent: true })
    }, 1200)

    return () => window.clearInterval(timer)
  }, [importing, websiteId])

  async function startImport(event) {
    event.preventDefault()
    setSaving(true)
    setImporting(true)
    setMessage('')

    try {
      const response = await fetch(`/api/cms/import?websiteId=${websiteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to start import.'))
        return
      }

      setForm(emptyForm)
      setMessage(`Import ${result.job?.status || 'finished'}.`)
      await loadJobs()
    } finally {
      setImporting(false)
      setSaving(false)
    }
  }

  async function resetImport() {
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(`/api/cms/import/reset?websiteId=${websiteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmReset }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to reset import data.'))
        return
      }

      setConfirmReset(false)
      setMessage('Import data reset.')
      await loadJobs()
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Migration"
        title="WordPress import"
        description="Import posts, authors, categories, known pages, and media into an inactive selected website."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadJobs}
            disabled={loading}
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        }
      />

      <MessageAlert message={message} tone={message?.includes('reset') || message?.includes('Import') ? 'info' : 'error'} />

      <ImportProgress job={activeImportJob} importing={importing} />

      {website?.isActive ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          WordPress import is available only while this website is inactive.
        </p>
      ) : null}

      <form
        onSubmit={startImport}
        className="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-2"
      >
        <input
          type="text"
          value={form.wordpressBaseUrl}
          onChange={(event) =>
            setForm((current) => ({ ...current, wordpressBaseUrl: event.target.value }))
          }
          placeholder="https://wordpress-site.com"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 lg:col-span-2"
        />
        <input
          type="text"
          value={form.wordpressUsername}
          onChange={(event) =>
            setForm((current) => ({ ...current, wordpressUsername: event.target.value }))
          }
          placeholder="Optional WordPress username"
          className="rounded-md border border-slate-300 bg-white px-3 py-2"
        />
        <input
          type="password"
          value={form.wordpressApplicationPassword}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              wordpressApplicationPassword: event.target.value,
            }))
          }
          placeholder="Optional application password"
          className="rounded-md border border-slate-300 bg-white px-3 py-2"
        />
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={form.confirmInactiveImport}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                confirmInactiveImport: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-slate-300"
          />
          Confirm import into inactive website
        </label>
        <button
          type="submit"
          disabled={
            saving ||
            website?.isActive ||
            !form.wordpressBaseUrl ||
            !form.confirmInactiveImport
          }
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
        >
          {saving ? 'Importing...' : 'Start import'}
        </button>
      </form>

      <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-4">
        <label className="flex items-center gap-3 text-sm font-medium text-red-900">
          <input
            type="checkbox"
            checked={confirmReset}
            onChange={(event) => setConfirmReset(event.target.checked)}
            className="h-4 w-4 rounded border-red-300"
          />
          Confirm reset imported data for this inactive website
        </label>
        <button
          type="button"
          onClick={resetImport}
          disabled={saving || website?.isActive || !confirmReset}
          className="mt-3 rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-800 disabled:opacity-60"
        >
          Reset import data
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {jobs.map((job) => (
          <article key={job.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{job.sourceUrl}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {job.status} - {job.createdAt}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {job.sourceType}
              </span>
            </div>
            <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-white">
              {JSON.stringify(job.report || {}, null, 2)}
            </pre>
            {job.errorMessage ? (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {job.errorMessage}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}
