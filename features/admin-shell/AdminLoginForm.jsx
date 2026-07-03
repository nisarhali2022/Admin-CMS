'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AdminLoginForm() {
  const router = useRouter()
  const [secret, setSecret] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        setMessage(result.message || 'Unable to authenticate.')
        return
      }

      setSecret('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-sm space-y-4">
      <div>
        <label
          htmlFor="admin-secret"
          className="block text-sm font-medium text-slate-700"
        >
          Admin secret
        </label>
        <input
          id="admin-secret"
          type="password"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          autoComplete="current-password"
          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
        />
      </div>
      {message ? (
        <p className="text-sm font-medium text-red-700">{message}</p>
      ) : null}
      <button
        type="submit"
        disabled={submitting || !secret}
        className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {submitting ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}
