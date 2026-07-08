'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { Field, MessageAlert } from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
      router.push('/admin/add-website')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <Field label="Admin secret">
        <Input
          id="admin-secret"
          type="password"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          autoComplete="current-password"
          placeholder="Admin secret key"
          autoFocus
          className="h-12 rounded-lg px-4"
        />
      </Field>
      <MessageAlert message={message} />
      <Button
        type="submit"
        disabled={submitting || !secret}
        className="h-12 w-full rounded-lg font-semibold"
      >
        <LogIn />
        {submitting ? 'Checking...' : 'Login'}
      </Button>
    </form>
  )
}
