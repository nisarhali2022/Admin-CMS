'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
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
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const filteredCategories = useMemo(
    () => categories.filter((category) => categoryMatchesSearch(category, searchQuery)),
    [categories, searchQuery]
  )

  async function loadCategories() {
    if (!websiteId) return
    setLoading(true)
    setMessage('')
    setCountsFailed(false)

    try {
      const response = await fetch(`/api/cms/categories?websiteId=${websiteId}`, {
        cache: 'no-store',
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to load categories.'))
        return
      }

      setCategories(result.categories || [])

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
      setEditingCategoryId(null)
      await loadCategories()
    } finally {
      setSaving(false)
    }
  }

  async function updateCategory(categoryId) {
    if (!editingCategoryId || editingCategoryId !== categoryId) return
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/cms/categories/${categoryId}?websiteId=${websiteId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to update category.'))
        return
      }

      setEditingCategoryId(null)
      setForm(emptyForm)
      await loadCategories()
    } finally {
      setSaving(false)
    }
  }

  async function deleteCategory(categoryId) {
    if (!window.confirm('Delete this category permanently?')) return
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(`/api/cms/categories/${categoryId}?websiteId=${websiteId}`, {
        method: 'DELETE',
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to delete category.'))
        return
      }

      await loadCategories()
    } finally {
      setSaving(false)
    }
  }

  function startEditing(category) {
    setEditingCategoryId(category.id)
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
    })
  }

  function cancelEditing() {
    setEditingCategoryId(null)
    setForm(emptyForm)
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,40%)_minmax(0,60%)]">
        <form
          onSubmit={editingCategoryId ? (event) => {
            event.preventDefault()
            updateCategory(editingCategoryId)
          } : createCategory}
          className="space-y-5 border border-[#c3c4c7] bg-white p-4"
        >
          <h3 className="text-[1rem] font-semibold text-[#1f2330]">
            {editingCategoryId ? 'Edit Category' : 'Add Category'}
          </h3>

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
            {editingCategoryId ? 'Save Category' : 'Add Category'}
          </button>
          {editingCategoryId ? (
            <button
              type="button"
              onClick={cancelEditing}
              className="ml-2 rounded-[3px] border border-[#8c8f94] bg-white px-4 py-2 font-semibold text-[#1f2330] hover:border-[#1f2330]"
            >
              Cancel edit
            </button>
          ) : null}
        </form>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full max-w-xs rounded-none border border-[#8c8f94] bg-white px-2 py-2 outline-none"
              aria-label="Search categories"
              placeholder="Search categories"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div />
            <p className="text-[0.85rem] text-[#1f2330]">
              {filteredCategories.length} {filteredCategories.length === 1 ? 'item' : 'items'}
            </p>
          </div>

          <div className="overflow-x-auto border border-[#c3c4c7] bg-white">
            <table className="w-full min-w-[54rem] text-left text-[#1f2330]">
              <thead>
                <tr className="border-b border-[#c3c4c7] bg-white text-[#3858e9]">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Slug</th>
                  <th className="w-20 px-3 py-2 text-right font-medium">Count</th>
                  <th className="w-40 px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((category) => {
                  const count = countsFailed ? '-' : postCounts[category.id] || 0

                  return (
                    <tr
                      key={category.id}
                      className="border-b border-[#c3c4c7] bg-white align-top odd:bg-[#f6f7f7]"
                    >
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          <p className="font-normal text-[#1f2330]">{category.name}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[#1f2330]">
                        {category.slug}
                      </td>
                      <td className="px-3 py-3 text-right text-[#1f2330]">{count}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-x-2 gap-y-1 text-[0.84rem]">
                          <button
                            type="button"
                            onClick={() => startEditing(category)}
                            className="font-medium text-[#3858e9] hover:underline"
                          >
                            Edit
                          </button>
                          <span className="text-[#8c8f94]">|</span>
                          <button
                            type="button"
                            onClick={() => deleteCategory(category.id)}
                            className="font-medium text-red-700 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-[#596171]">
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
