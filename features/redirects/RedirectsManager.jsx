'use client'

import { useEffect, useState } from 'react'

const emptyForm = {
  fromPath: '',
  toUrl: '',
  redirectType: 301,
  isActive: true,
}

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
}

export default function RedirectsManager({ websiteId }) {
  const [redirects, setRedirects] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function loadRedirects() {
    if (!websiteId) return
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/cms/redirects?websiteId=${websiteId}&includeTrashed=true`,
        { cache: 'no-store' }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to load redirects.'))
        return
      }

      setRedirects(result.redirects || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRedirects()
  }, [websiteId])

  async function createRedirect(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(`/api/cms/redirects?websiteId=${websiteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to create redirect.'))
        return
      }

      setForm(emptyForm)
      await loadRedirects()
    } finally {
      setSaving(false)
    }
  }

  async function updateRedirect(redirectId) {
    const draft = editing[redirectId]
    if (!draft) return
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/cms/redirects/${redirectId}?websiteId=${websiteId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to update redirect.'))
        return
      }

      setEditing((current) => {
        const next = { ...current }
        delete next[redirectId]
        return next
      })
      await loadRedirects()
    } finally {
      setSaving(false)
    }
  }

  async function redirectAction(redirectId, action, method = 'POST') {
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/cms/redirects/${redirectId}${action ? `/${action}` : ''}?websiteId=${websiteId}`,
        { method }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to update redirect.'))
        return
      }

      await loadRedirects()
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-8 border-t border-slate-200 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Routing
          </p>
          <h3 className="mt-1 text-xl font-bold">Redirects</h3>
        </div>
        <button
          type="button"
          onClick={loadRedirects}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Refresh redirects'}
        </button>
      </div>

      {message ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {message}
        </p>
      ) : null}

      <form
        onSubmit={createRedirect}
        className="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_7rem_8rem_auto]"
      >
        <input
          type="text"
          value={form.fromPath}
          onChange={(event) => setForm((current) => ({ ...current, fromPath: event.target.value }))}
          placeholder="/old-path"
          className="rounded-md border border-slate-300 bg-white px-3 py-2"
        />
        <input
          type="text"
          value={form.toUrl}
          onChange={(event) => setForm((current) => ({ ...current, toUrl: event.target.value }))}
          placeholder="/new-path"
          className="rounded-md border border-slate-300 bg-white px-3 py-2"
        />
        <select
          value={form.redirectType}
          onChange={(event) =>
            setForm((current) => ({ ...current, redirectType: Number(event.target.value) }))
          }
          className="rounded-md border border-slate-300 bg-white px-3 py-2"
        >
          <option value={301}>301</option>
          <option value={302}>302</option>
        </select>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
            className="h-4 w-4 rounded border-slate-300"
          />
          Active
        </label>
        <button
          type="submit"
          disabled={saving || !form.fromPath || !form.toUrl}
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
        >
          Add
        </button>
      </form>

      <div className="mt-4 grid gap-3">
        {redirects.map((redirect) => {
          const draft = editing[redirect.id] || {
            fromPath: redirect.fromPath,
            toUrl: redirect.toUrl,
            redirectType: redirect.redirectType,
            isActive: redirect.isActive,
          }

          return (
            <article
              key={redirect.id}
              className={`rounded-lg border p-4 ${
                redirect.deletedAt
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_7rem_8rem]">
                <input
                  type="text"
                  value={draft.fromPath}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      [redirect.id]: { ...draft, fromPath: event.target.value },
                    }))
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                />
                <input
                  type="text"
                  value={draft.toUrl}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      [redirect.id]: { ...draft, toUrl: event.target.value },
                    }))
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                />
                <select
                  value={draft.redirectType}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      [redirect.id]: { ...draft, redirectType: Number(event.target.value) },
                    }))
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                >
                  <option value={301}>301</option>
                  <option value={302}>302</option>
                </select>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(event) =>
                      setEditing((current) => ({
                        ...current,
                        [redirect.id]: { ...draft, isActive: event.target.checked },
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Active
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateRedirect(redirect.id)}
                  disabled={saving}
                  className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
                >
                  Save
                </button>
                {redirect.deletedAt ? (
                  <>
                    <button
                      type="button"
                      onClick={() => redirectAction(redirect.id, 'restore')}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => redirectAction(redirect.id, '', 'DELETE')}
                      className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => redirectAction(redirect.id, 'trash')}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"
                  >
                    Trash
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
