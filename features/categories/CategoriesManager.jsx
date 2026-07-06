'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { MessageAlert } from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'

const emptyForm = {
  name: '',
  slug: '',
  description: '',
}

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
}

function buildPostCounts(posts) {
  return posts.reduce((counts, post) => {
    if (!post.categoryId) return counts
    counts[post.categoryId] = (counts[post.categoryId] || 0) + 1
    return counts
  }, {})
}

function categoryMatchesSearch(category, query) {
  if (!query) return true

  const haystack = [
    category.name,
    category.slug,
    category.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query.toLowerCase())
}

export default function CategoriesManager({ websiteId }) {
  const [categories, setCategories] = useState([])
  const [postCounts, setPostCounts] = useState({})
  const [countsFailed, setCountsFailed] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState({})
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkAction, setBulkAction] = useState('trash')
  const [searchDraft, setSearchDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const filteredCategories = useMemo(
    () => categories.filter((category) => categoryMatchesSearch(category, searchQuery)),
    [categories, searchQuery]
  )

  const allVisibleSelected =
    filteredCategories.length > 0 &&
    filteredCategories.every((category) => selectedIds.includes(category.id))

  async function loadCategories() {
    if (!websiteId) return
    setLoading(true)
    setMessage('')
    setCountsFailed(false)

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
      setSelectedIds((current) =>
        current.filter((id) => (result.categories || []).some((category) => category.id === id))
      )

      try {
        const postsResponse = await fetch(`/api/cms/posts?websiteId=${websiteId}`, {
          cache: 'no-store',
        })
        const postsResult = await postsResponse.json().catch(() => ({}))

        if (!postsResponse.ok) {
          setPostCounts({})
          setCountsFailed(true)
          return
        }

        setPostCounts(buildPostCounts(postsResult.posts || []))
      } catch {
        setPostCounts({})
        setCountsFailed(true)
      }
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

  async function categoryAction(categoryId, action, method = 'POST', reload = true) {
    if (reload) {
      setSaving(true)
      setMessage('')
    }

    try {
      const response = await fetch(
        `/api/cms/categories/${categoryId}${action ? `/${action}` : ''}?websiteId=${websiteId}`,
        { method }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to update category.'))
        return false
      }

      if (reload) await loadCategories()
      return true
    } finally {
      if (reload) setSaving(false)
    }
  }

  async function runBulkAction() {
    if (selectedIds.length === 0) return
    setSaving(true)
    setMessage('')

    try {
      for (const categoryId of selectedIds) {
        const ok = await categoryAction(categoryId, bulkAction, 'POST', false)
        if (!ok) return
      }
      setSelectedIds([])
      await loadCategories()
    } finally {
      setSaving(false)
    }
  }

  function toggleVisibleSelection(checked) {
    const visibleIds = filteredCategories.map((category) => category.id)

    setSelectedIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...visibleIds]))
      }

      return current.filter((id) => !visibleIds.includes(id))
    })
  }

  function toggleCategorySelection(categoryId, checked) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, categoryId]))
      return current.filter((id) => id !== categoryId)
    })
  }

  function startEditing(category) {
    setEditing((current) => ({
      ...current,
      [category.id]: {
        name: category.name,
        slug: category.slug,
        description: category.description || '',
      },
    }))
  }

  function cancelEditing(categoryId) {
    setEditing((current) => {
      const next = { ...current }
      delete next[categoryId]
      return next
    })
  }

  function submitSearch(event) {
    event.preventDefault()
    setSearchQuery(searchDraft.trim())
  }

  return (
    <section className="category-taxonomy-screen space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[1.55rem] font-normal leading-tight text-[#1f2330]">
          Categories
        </h2>
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
      </div>

      <MessageAlert message={message} />

      <div className="space-y-6">
        <form
          onSubmit={createCategory}
          className="space-y-5 border border-[#c3c4c7] bg-white p-4"
        >
          <h3 className="text-[1rem] font-semibold text-[#1f2330]">Add Category</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block font-medium text-[#1f2330]" htmlFor="category-name">
                Name
              </label>
              <input
                id="category-name"
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
              />
              <p className="text-[0.85rem] leading-5 text-[#596171]">
                The name is how it appears on your site.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block font-medium text-[#1f2330]" htmlFor="category-slug">
                Slug
              </label>
              <input
                id="category-slug"
                type="text"
                value={form.slug}
                onChange={(event) =>
                  setForm((current) => ({ ...current, slug: event.target.value }))
                }
                className="w-full rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
              />
              <p className="text-[0.85rem] leading-5 text-[#596171]">
                The slug is the URL-friendly version of the name. It is usually all
                lowercase and contains only letters, numbers, and hyphens.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-medium text-[#1f2330]" htmlFor="category-description">
              Description
            </label>
            <textarea
              id="category-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={6}
              className="w-full rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
            />
            <p className="text-[0.85rem] leading-5 text-[#596171]">
              The description is not prominent by default; however, some themes may show it.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || !form.name}
            className="rounded-[3px] bg-[#3858e9] px-4 py-2 font-semibold text-white transition hover:bg-[#2944c9] disabled:cursor-not-allowed disabled:bg-[#a7b0f7]"
          >
            Add Category
          </button>
        </form>

        <div className="min-w-0 space-y-3">
          <form
            onSubmit={submitSearch}
            className="flex flex-wrap items-center justify-end gap-2"
          >
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              className="w-full max-w-xs rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
              aria-label="Search categories"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-[3px] border border-[#3858e9] bg-white px-4 py-2 font-semibold text-[#3858e9] hover:bg-[#f0f3ff]"
            >
              <Search className="h-3.5 w-3.5" />
              Search Categories
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={bulkAction}
                onChange={(event) => setBulkAction(event.target.value)}
                className="rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
                aria-label="Bulk action"
              >
                <option value="trash">Trash selected</option>
                <option value="restore">Restore selected</option>
              </select>
              <button
                type="button"
                onClick={runBulkAction}
                disabled={saving || selectedIds.length === 0}
                className="rounded-[3px] border border-[#3858e9] bg-white px-4 py-2 font-semibold text-[#3858e9] hover:bg-[#f0f3ff] disabled:cursor-not-allowed disabled:border-[#b8bfd6] disabled:text-[#8a93a7]"
              >
                Apply
              </button>
            </div>
            <p className="text-[0.85rem] text-[#1f2330]">
              {filteredCategories.length} {filteredCategories.length === 1 ? 'item' : 'items'}
            </p>
          </div>

          <div className="overflow-x-auto border border-[#c3c4c7] bg-white">
            <table className="w-full min-w-[54rem] text-left text-[#1f2330]">
              <thead>
                <tr className="border-b border-[#c3c4c7] bg-white text-[#3858e9]">
                  <th className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(event) => toggleVisibleSelection(event.target.checked)}
                      aria-label="Select all visible categories"
                    />
                  </th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Slug</th>
                  <th className="w-20 px-3 py-2 text-right font-medium">Count</th>
                  <th className="w-40 px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((category) => {
                  const draft = editing[category.id]
                  const isEditing = Boolean(draft)
                  const isSelected = selectedIds.includes(category.id)
                  const description = category.description || '-'
                  const count = countsFailed ? '-' : postCounts[category.id] || 0

                  return (
                    <tr
                      key={category.id}
                      className={
                        category.deletedAt
                          ? 'border-b border-[#c3c4c7] bg-amber-50 align-top'
                          : 'border-b border-[#c3c4c7] bg-white align-top odd:bg-[#f6f7f7]'
                      }
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(event) =>
                            toggleCategorySelection(category.id, event.target.checked)
                          }
                          aria-label={`Select ${category.name}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={draft.name}
                              onChange={(event) =>
                                setEditing((current) => ({
                                  ...current,
                                  [category.id]: { ...draft, name: event.target.value },
                                }))
                              }
                              className="w-full rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="font-normal text-[#1f2330]">{category.name}</p>
                            {category.deletedAt ? (
                              <p className="text-[0.78rem] font-semibold uppercase text-amber-700">
                                Trashed
                              </p>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[#1f2330]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={draft.description}
                            onChange={(event) =>
                              setEditing((current) => ({
                                ...current,
                                [category.id]: {
                                  ...draft,
                                  description: event.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
                          />
                        ) : (
                          description
                        )}
                      </td>
                      <td className="px-3 py-3 text-[#1f2330]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={draft.slug}
                            onChange={(event) =>
                              setEditing((current) => ({
                                ...current,
                                [category.id]: { ...draft, slug: event.target.value },
                              }))
                            }
                            className="w-full rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
                          />
                        ) : (
                          category.slug
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-[#1f2330]">{count}</td>
                      <td className="px-3 py-3">
                        {isEditing ? (
                          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[0.84rem]">
                            <button
                              type="button"
                              onClick={() => updateCategory(category.id)}
                              disabled={saving}
                              className="font-medium text-[#3858e9] hover:underline disabled:text-[#8a93a7]"
                            >
                              Save
                            </button>
                            <span className="text-[#8c8f94]">|</span>
                            <button
                              type="button"
                              onClick={() => cancelEditing(category.id)}
                              className="font-medium text-[#3858e9] hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[0.84rem]">
                            <button
                              type="button"
                              onClick={() => startEditing(category)}
                              className="font-medium text-[#3858e9] hover:underline"
                            >
                              Edit
                            </button>
                            <span className="text-[#8c8f94]">|</span>
                            {category.deletedAt ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => categoryAction(category.id, 'restore')}
                                  className="font-medium text-[#3858e9] hover:underline"
                                >
                                  Restore
                                </button>
                                <span className="text-[#8c8f94]">|</span>
                                <button
                                  type="button"
                                  onClick={() => categoryAction(category.id, '', 'DELETE')}
                                  className="font-medium text-red-700 hover:underline"
                                >
                                  Delete Permanently
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => categoryAction(category.id, 'trash')}
                                className="font-medium text-red-700 hover:underline"
                              >
                                Trash
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-[#596171]">
                      No categories found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
