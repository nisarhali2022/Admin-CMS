'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { MessageAlert, PageHeader } from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'

const emptyForm = {
  name: '',
  slug: '',
  description: '',
}

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
}

export default function CategoriesManager({ websiteId }) {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function loadCategories() {
    if (!websiteId) return
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/cms/categories?websiteId=${websiteId}&includeTrashed=true`,
        { cache: 'no-store' }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to load categories.'))
        return
      }

      setCategories(result.categories || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [websiteId])

  async function createCategory(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(`/api/cms/categories?websiteId=${websiteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to create category.'))
        return
      }

      setForm(emptyForm)
      await loadCategories()
    } finally {
      setSaving(false)
    }
  }

  async function updateCategory(categoryId) {
    const draft = editing[categoryId]
    if (!draft) return
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/cms/categories/${categoryId}?websiteId=${websiteId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to update category.'))
        return
      }

      setEditing((current) => {
        const next = { ...current }
        delete next[categoryId]
        return next
      })
      await loadCategories()
    } finally {
      setSaving(false)
    }
  }

  async function categoryAction(categoryId, action, method = 'POST') {
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/cms/categories/${categoryId}${action ? `/${action}` : ''}?websiteId=${websiteId}`,
        { method }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to update category.'))
        return
      }

      await loadCategories()
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Blog"
        title="Categories"
        description="Manage the website-scoped category list used by posts and public filtering."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadCategories}
            disabled={loading}
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        }
      />

      <MessageAlert message={message} />

      <form
        onSubmit={createCategory}
        className="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(12rem,1fr)_auto]"
      >
        <input
          type="text"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Name"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
        />
        <input
          type="text"
          value={form.slug}
          onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
          placeholder="Slug"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
        />
        <input
          type="text"
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({ ...current, description: event.target.value }))
          }
          placeholder="Description"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
        />
        <button
          type="submit"
          disabled={saving || !form.name}
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          Add
        </button>
      </form>

      <div className="mt-4 grid gap-3">
        {categories.map((category) => {
          const draft = editing[category.id] || {
            name: category.name,
            slug: category.slug,
            description: category.description || '',
          }

          return (
            <article
              key={category.id}
              className={`rounded-lg border p-4 ${
                category.deletedAt
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(12rem,1fr)]">
                <input
                  type="text"
                  value={draft.name}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      [category.id]: { ...draft, name: event.target.value },
                    }))
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                />
                <input
                  type="text"
                  value={draft.slug}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      [category.id]: { ...draft, slug: event.target.value },
                    }))
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                />
                <input
                  type="text"
                  value={draft.description}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      [category.id]: { ...draft, description: event.target.value },
                    }))
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateCategory(category.id)}
                  disabled={saving}
                  className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
                >
                  Save
                </button>
                {category.deletedAt ? (
                  <>
                    <button
                      type="button"
                      onClick={() => categoryAction(category.id, 'restore')}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => categoryAction(category.id, '', 'DELETE')}
                      className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => categoryAction(category.id, 'trash')}
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
