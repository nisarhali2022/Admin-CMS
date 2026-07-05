'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

const EMPTY_QUESTION = { question: '', options: ['', '', '', ''], answer: '' }
const EMPTY_QUESTIONS = Array.from({ length: 5 }, () => ({
  ...EMPTY_QUESTION,
  options: [...EMPTY_QUESTION.options],
}))

function cloneQuestions(questions = EMPTY_QUESTIONS) {
  return questions.map((item) => ({
    question: item.question || '',
    options: Array.isArray(item.options)
      ? [...item.options, '', '', '', ''].slice(0, 4)
      : ['', '', '', ''],
    answer: item.answer || '',
  }))
}

function getEmptyForm() {
  return {
    isPublished: true,
    questions: cloneQuestions(),
  }
}

function toForm(quiz) {
  if (!quiz) return getEmptyForm()

  return {
    isPublished: quiz.isPublished ?? true,
    questions: cloneQuestions(quiz.questions),
  }
}

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
}

export default function QuizManager() {
  const [form, setForm] = useState(getEmptyForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  async function loadQuiz() {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/quiz', { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage({
          type: 'error',
          text: getApiMessage(result, 'Unable to load quiz.'),
        })
        return
      }

      setForm(toForm(result.quiz))
    } catch {
      setMessage({ type: 'error', text: 'Unable to reach the CMS server.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuiz()
  }, [])

  function updateQuestion(questionIndex, field, value) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex ? { ...question, [field]: value } : question,
      ),
    }))
  }

  function updateOption(questionIndex, optionIndex, value) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) => {
        if (index !== questionIndex) return question

        const wasAnswer =
          question.answer.trim() !== '' &&
          question.options[optionIndex]?.trim().toLowerCase() ===
          question.answer.trim().toLowerCase()

        return {
          ...question,
          answer: wasAnswer ? value.trim() : question.answer,
          options: question.options.map((option, currentOptionIndex) =>
            currentOptionIndex === optionIndex ? value : option,
          ),
        }
      }),
    }))
  }

  function setAnswer(questionIndex, option) {
    if (!option.trim()) return

    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex
          ? { ...question, answer: option.trim() }
          : question,
      ),
    }))
  }

  function validateClientQuiz() {
    for (let index = 0; index < form.questions.length; index += 1) {
      const question = form.questions[index]

      if (!question.question.trim()) {
        return `Question ${index + 1} is empty.`
      }

      if (question.options.some((option) => !option.trim())) {
        return `Question ${index + 1} must have 4 options.`
      }

      if (
        !question.answer.trim() ||
        !question.options.some(
          (option) => option.trim().toLowerCase() === question.answer.trim().toLowerCase(),
        )
      ) {
        return `Question ${index + 1} has no valid answer selected.`
      }
    }

    return null
  }

  async function saveQuiz() {
    const validationError = validateClientQuiz()
    if (validationError) {
      setMessage({ type: 'error', text: validationError })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/quiz', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage({
          type: 'error',
          text: getApiMessage(result, 'Unable to save quiz.'),
        })
        return
      }

      setForm(toForm(result.quiz))
      setMessage({
        type: 'success',
        text: 'Quiz saved.',
      })
    } catch {
      setMessage({ type: 'error', text: 'Unable to reach the CMS server.' })
    } finally {
      setSaving(false)
    }
  }

  function handleClear() {
    if (window.confirm('Clear all questions? This will erase unsaved data.')) {
      setForm((current) => ({
        ...current,
        questions: cloneQuestions(),
      }))
      setMessage(null)
    }
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-surface">
      <div className="mx-auto max-w-3xl px-0 py-3 sm:px-4 sm:py-8">
        <div className="mb-5 overflow-hidden rounded-lg border border-border bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-primary px-5 py-4 text-white">
            <div>
              <h1 className="font-heading text-lg font-bold">Quiz Admin</h1>
              <p className="mt-0.5 text-sm text-blue-100">Current global quiz</p>
            </div>
            <button
              type="button"
              onClick={loadQuiz}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded border border-blue-300 px-3 py-1.5 text-sm text-blue-100 transition-colors hover:text-white disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-text-secondary">
            Loading existing quiz...
          </div>
        ) : (
          <div className="space-y-5">
            {form.questions.map((question, questionIndex) => (
              <div
                key={questionIndex}
                className="overflow-hidden rounded-lg border border-border bg-white shadow-sm"
              >
                <div className="flex items-center gap-3 bg-primary px-5 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d54e21] text-xs font-bold text-white">
                    {questionIndex + 1}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    Question {questionIndex + 1}
                  </span>
                </div>

                <div className="space-y-4 p-5">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-text-secondary">
                      Question Text
                    </label>
                    <input
                      type="text"
                      value={question.question}
                      onChange={(event) =>
                        updateQuestion(questionIndex, 'question', event.target.value)
                      }
                      placeholder="e.g. H2O is commonly known as ____?"
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase text-text-secondary">
                      Options - choose the correct answer
                    </label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {question.options.map((option, optionIndex) => {
                        const isAnswer =
                          option.trim() !== '' &&
                          option.toLowerCase().trim() ===
                            question.answer.toLowerCase().trim()

                        return (
                          <div key={optionIndex} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setAnswer(questionIndex, option)}
                              title="Mark as correct answer"
                              className={`h-7 w-7 shrink-0 rounded-full border-2 text-xs font-bold transition-colors ${
                                isAnswer
                                  ? 'border-green-500 bg-green-500 text-white'
                                  : 'border-border text-text-secondary hover:border-green-400'
                              }`}
                            >
                              {isAnswer ? 'OK' : String.fromCharCode(65 + optionIndex)}
                            </button>
                            <input
                              type="text"
                              value={option}
                              onChange={(event) =>
                                updateOption(questionIndex, optionIndex, event.target.value)
                              }
                              placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                              className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                                isAnswer ? 'border-green-400 bg-green-50' : 'border-border'
                              }`}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {question.answer ? (
                    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                      <span className="text-xs font-bold text-green-800">Answer:</span>
                      <span className="text-sm font-bold text-green-800">
                        {question.answer}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {message ? (
          <div
            className={`mt-6 rounded-lg px-4 py-3 text-sm font-medium ${
              message.type === 'success'
                ? 'border border-green-300 bg-green-50 text-green-800'
                : message.type === 'warning'
                  ? 'border border-amber-300 bg-amber-50 text-amber-800'
                  : 'border border-red-200 bg-red-50 text-red-700'
            }`}
            role="status"
          >
            {message.text}
          </div>
        ) : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={saveQuiz}
            disabled={saving}
            className="flex-1 rounded-lg bg-[#d54e21] py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#b93f17] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Quiz'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-red-300 px-5 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            Clear All
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-text-secondary">
          Saving stores one global quiz in Supabase for all public websites.
        </p>
      </div>
    </div>
  )
}
