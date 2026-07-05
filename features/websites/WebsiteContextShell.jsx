'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { EmptyState, LoadingState, MessageAlert } from '@/components/admin/admin-ui'

function getApiMessage(result, fallback) {
  return result?.error || result?.message || fallback
}

export default function WebsiteContextShell({ children }) {
  const searchParams = useSearchParams()
  const selectedWebsiteId = searchParams.get('websiteId')
  const [websites, setWebsites] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const selectedWebsite = useMemo(
    () => websites.find((website) => website.id === selectedWebsiteId) || null,
    [selectedWebsiteId, websites],
  )

  useEffect(() => {
    let active = true

    async function loadWebsites() {
      setLoading(true)
      setMessage('')

      try {
        const response = await fetch('/api/cms/websites', { cache: 'no-store' })
        const result = await response.json().catch(() => ({}))

        if (!active) return

        if (!response.ok) {
          setMessage(getApiMessage(result, 'Unable to load websites.'))
          return
        }

        setWebsites(result.websites || [])
      } catch {
        if (active) {
          setMessage('Unable to reach the CMS server. Restart the dev server and try again.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadWebsites()

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return <LoadingState label="Loading selected website..." />
  }

  if (message) {
    return <MessageAlert message={message} />
  }

  if (!selectedWebsiteId) {
    return (
      <EmptyState
        title="Select a website"
        description="Choose a website from the header dropdown to manage this section."
      />
    )
  }

  if (!selectedWebsite) {
    return (
      <EmptyState
        title="Website not found"
        description="Choose another website from the header dropdown or add the website again."
      />
    )
  }

  return children({ selectedWebsite })
}
