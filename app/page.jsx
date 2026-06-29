'use client'

import { useEffect, useState } from 'react'
import { getKarachiDateLabel } from '@/lib/date'

const EMPTY_QUESTION = { question: '', options: ['', '', '', ''], answer: '' }

const DEFAULT_QUESTIONS = Array.from({ length: 5 }, () => ({
  ...EMPTY_QUESTION,
  options: ['', '', '', ''],
}))

function cloneDefaultQuestions() {
  return DEFAULT_QUESTIONS.map((question) => ({
    ...question,
    options: [...question.options],
  }))
}


function SiteResultList({ results }) {
  if (!results?.length) return null

  return (
    <div className="mt-4 space-y-2" aria-label="Website publish results">
      {results.map((result) => (
        <div
          key={result.key || result.label}
          className={`rounded-lg border px-3 py-2 text-sm ${
            result.ok
              ? 'border-green-300 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="font-semibold">{result.label}</span>
            <span className="text-xs font-bold uppercase">
              {result.ok ? 'Updated' : 'Failed'}
            </span>
          </div>
          <p className="mt-1 text-sm">
            {result.ok
              ? `Post ${result.id ? `#${result.id} ` : ''}saved successfully.`
              : result.message || 'This website could not be updated.'}
          </p>
          {result.ok && result.revalidate && (
            <p
              className={`mt-1 text-sm ${
                result.revalidate.ok === false
                  ? 'text-amber-800'
                  : 'text-green-800'
              }`}
            >
              Revalidate:{' '}
              {result.revalidate.configured
                ? result.revalidate.message
                : 'Not configured.'}
            </p>
          )}
          {result.ok && result.revalidate?.requests?.length > 0 && (
            <p className="mt-1 text-xs text-text-secondary">
              Requested:{' '}
              {result.revalidate.requests
                .map((request) => request.path)
                .join(', ')}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

export default function AdminQuizPage() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [questions, setQuestions] = useState(cloneDefaultQuestions)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [siteResults, setSiteResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setAuthed(Boolean(data.authenticated)))
      .catch(() => setAuthed(false))
  }, [])

  useEffect(() => {
    if (!authed) return

    setLoading(true)
    fetch('/api/quiz', { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401) {
          setAuthed(false)
          throw new Error('Your admin session has expired.')
        }

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'Unable to load the current quiz.')
        }

        return data
      })
      .then((data) => {
        if (data?.questions?.length) {
          setQuestions(data.questions)
        }
      })
      .catch((error) => setAuthMessage(error.message))
      .finally(() => setLoading(false))
  }, [authed])

  async function handleLogin(event) {
    event.preventDefault()
    if (!secret.trim()) return

    setAuthLoading(true)
    setAuthMessage('')

    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })
      const data = await response.json()

      if (!response.ok) {
        setAuthMessage(data.message || 'Login failed.')
        return
      }

      setSecret('')
      setAuthed(true)
    } catch {
      setAuthMessage('Unable to contact the server.')
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/session', { method: 'DELETE' }).catch(() => {})
    setAuthed(false)
    setQuestions(cloneDefaultQuestions())
    setMessage(null)
    setSiteResults([])
  }

  function updateQuestion(questionIndex, field, value) {
    setQuestions((prev) =>
      prev.map((question, index) =>
        index === questionIndex ? { ...question, [field]: value } : question
      )
    )
  }

  function updateOption(questionIndex, optionIndex, value) {
    setQuestions((prev) =>
      prev.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option, currentOptionIndex) =>
                currentOptionIndex === optionIndex ? value : option
              ),
            }
          : question
      )
    )
  }

  function setAnswer(questionIndex, option) {
    setQuestions((prev) =>
      prev.map((question, index) =>
        index === questionIndex ? { ...question, answer: option } : question
      )
    )
  }

  async function handleSave() {
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]

      if (!question.question.trim()) {
        setMessage({ type: 'error', text: `Question ${i + 1} is empty.` })
        setSiteResults([])
        return
      }

      if (!question.answer.trim()) {
        setMessage({
          type: 'error',
          text: `Question ${i + 1} has no answer selected.`,
        })
        setSiteResults([])
        return
      }
    }

    setSaving(true)
    setMessage(null)
    setSiteResults([])

    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      })
      const data = await response.json()

      if (response.status === 401) {
        setAuthed(false)
        setAuthMessage('Your admin session has expired. Please log in again.')
        return
      }

      setSiteResults(data.results || [])

      if (response.ok) {
        const failedCount = data.results?.filter((result) => !result.ok).length || 0
        const revalidateFailedCount =
          data.results?.filter(
            (result) => result.ok && result.revalidate?.ok === false
          ).length || 0
        setMessage({
          type:
            failedCount > 0 || revalidateFailedCount > 0
              ? 'warning'
              : 'success',
          text:
            failedCount > 0
              ? `Quiz saved with ${failedCount} website update failure.`
              : revalidateFailedCount > 0
                ? `Quiz saved, but ${revalidateFailedCount} website cache revalidate failed.`
              : `Quiz saved for ${getKarachiDateLabel()} on all websites.`,
        })
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to save.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  function handleClear() {
    if (window.confirm('Clear all questions? This will erase unsaved data.')) {
      setQuestions(cloneDefaultQuestions())
      setMessage(null)
      setSiteResults([])
    }
  }

  if (authed === null) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-text-secondary">Checking admin session...</p>
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-lg shadow-lg p-8 border border-border">
          <div className="text-center mb-6">
            <h1 className="font-heading font-bold text-xl text-text-primary">
              Quiz Admin
            </h1>
            <p className="text-text-secondary mt-1">
              Enter your admin secret to continue
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="Admin secret key"
              className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            {authMessage && (
              <p className="text-red-600" role="alert">
                {authMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {authLoading ? 'Checking...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-primary text-white px-6 py-4 flex items-center justify-between shadow">
        <div>
          <h1 className="font-heading font-bold text-lg">Quiz Admin</h1>
          <p className="text-blue-100 text-sm mt-0.5">
            Karachi date: {getKarachiDateLabel()}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-blue-100 hover:text-white transition-colors border border-blue-300 px-3 py-1.5 rounded"
        >
          Logout
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-10 text-text-secondary">
            Loading existing quiz...
          </div>
        ) : (
          <div className="space-y-5">
            {questions.map((question, questionIndex) => (
              <div
                key={questionIndex}
                className="bg-white border border-border rounded-lg shadow-sm overflow-hidden"
              >
                <div className="bg-primary px-5 py-3 flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {questionIndex + 1}
                  </span>
                  <span className="text-white text-sm font-semibold">
                    Question {questionIndex + 1}
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1 uppercase">
                      Question Text
                    </label>
                    <input
                      type="text"
                      value={question.question}
                      onChange={(event) =>
                        updateQuestion(
                          questionIndex,
                          'question',
                          event.target.value
                        )
                      }
                      placeholder="e.g. H2O is commonly known as ____?"
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                      Options - choose the correct answer
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {question.options.map((option, optionIndex) => {
                        const isAnswer =
                          option.trim() !== '' &&
                          option.toLowerCase().trim() ===
                            question.answer.toLowerCase().trim()

                        return (
                          <div key={optionIndex} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                option.trim() &&
                                setAnswer(questionIndex, option.trim())
                              }
                              title="Mark as correct answer"
                              className={`flex-shrink-0 w-7 h-7 rounded-full border-2 text-xs font-bold transition-colors ${
                                isAnswer
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'border-border text-text-secondary hover:border-green-400'
                              }`}
                            >
                              {isAnswer ? 'OK' : String.fromCharCode(65 + optionIndex)}
                            </button>
                            <input
                              type="text"
                              value={option}
                              onChange={(event) => {
                                updateOption(
                                  questionIndex,
                                  optionIndex,
                                  event.target.value
                                )
                                if (isAnswer) {
                                  setAnswer(questionIndex, event.target.value)
                                }
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                              className={`flex-1 min-w-0 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                                isAnswer ? 'border-green-400 bg-green-50' : 'border-border'
                              }`}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {question.answer && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <span className="text-green-800 text-xs font-bold">
                        Answer:
                      </span>
                      <span className="text-green-800 text-sm font-bold">
                        {question.answer}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {message && (
          <div
            className={`mt-6 px-4 py-3 rounded-lg text-sm font-medium ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-300'
                : message.type === 'warning'
                  ? 'bg-amber-50 text-amber-800 border border-amber-300'
                  : 'bg-red-50 text-red-700 border border-red-200'
            }`}
            role="status"
          >
            {message.text}
          </div>
        )}

        <SiteResultList results={siteResults} />

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-accent text-white font-bold rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {saving ? 'Saving...' : 'Save Quiz To All Websites'}
          </button>
          <button
            onClick={handleClear}
            className="px-5 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-semibold"
          >
            Clear All
          </button>
        </div>

        <p className="mt-4 text-xs text-text-secondary text-center">
          Saving publishes the same quiz to every configured WordPress website.
        </p>
      </div>
    </div>
  )
}
