'use client'

import { useEffect, useState } from 'react'

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
}

function toForm(quiz) {
  return {
    title: quiz?.title || '',
    slug: quiz?.slug || '',
    description: quiz?.description || '',
    isPublished: quiz?.isPublished ?? true,
  }
}

export default function QuizManager() {
  const [quiz, setQuiz] = useState(null)
  const [form, setForm] = useState(toForm(null))
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function loadQuiz() {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/quiz', { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to load quiz.'))
        return
      }

      setQuiz(result.quiz)
      setForm(toForm(result.quiz))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuiz()
  }, [])

  async function saveQuiz(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch('/api/quiz', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(getApiMessage(result, 'Unable to save quiz.'))
        return
      }

      setQuiz(result.quiz)
      setForm(toForm(result.quiz))
      setMessage('Global quiz updated.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Global
          </p>
          <h2 className="mt-1 text-2xl font-bold">Quiz</h2>
        </div>
        <button
          type="button"
          onClick={loadQuiz}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Refresh quiz'}
        </button>
      </div>

      {message ? (
        <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
          {message}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <form
          onSubmit={saveQuiz}
          className="rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <label className="block text-sm font-medium text-slate-700">
            Title
            <input
              type="text"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Slug
            <input
              type="text"
              value={form.slug}
              onChange={(event) =>
                setForm((current) => ({ ...current, slug: event.target.value }))
              }
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Description
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={4}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            />
          </label>
          <label className="mt-4 flex items-center gap-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isPublished: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            Published
          </label>
          <button
            type="submit"
            disabled={saving || !form.title || !form.description}
            className="mt-4 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
          >
            {saving ? 'Saving...' : 'Save global quiz'}
          </button>
        </form>

        <aside className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-base font-bold">Current output</h3>
          {quiz ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-slate-500">Visible title</dt>
                <dd className="mt-1 text-slate-950">{quiz.visibleTitle}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">SEO title</dt>
                <dd className="mt-1 text-slate-950">{quiz.seoTitle}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Visible date</dt>
                <dd className="mt-1 text-slate-950">{quiz.visibleDate}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Schema date</dt>
                <dd className="mt-1 text-slate-950">{quiz.schemaDate}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Scope</dt>
                <dd className="mt-1 text-slate-950">
                  {quiz.global ? 'Global quiz' : 'Website scoped'}
                </dd>
              </div>
            </dl>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
