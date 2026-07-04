'use client'

import { useEffect, useState } from 'react'

const emptyForm = {
  wordpressBaseUrl: '',
  wordpressUsername: '',
  wordpressApplicationPassword: '',
  confirmInactiveImport: false,
}

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
}

export default function ImportManager({ website }) {
  const websiteId = website?.id
  const [jobs, setJobs] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [confirmReset, setConfirmReset] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function loadJobs() {
    if (!websiteId) return
    setLoading(true)
    setMessage('')

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
      setLoading(false)
    }
  }

  useEffect(() => {
    loadJobs()
  }, [websiteId])

  async function startImport(event) {
    event.preventDefault()
    setSaving(true)
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
    <section className="mt-8 border-t border-slate-200 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Migration
          </p>
          <h3 className="mt-1 text-xl font-bold">WordPress import</h3>
        </div>
        <button
          type="button"
          onClick={loadJobs}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Refresh jobs'}
        </button>
      </div>

      {message ? (
        <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
          {message}
        </p>
      ) : null}

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
