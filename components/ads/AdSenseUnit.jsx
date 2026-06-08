'use client'

import { useEffect } from 'react'
import { SITE_CONFIG } from '@/lib/constants'

export default function AdSenseUnit({ slot, format = 'auto', className = '' }) {
  useEffect(() => {
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {}
  }, [])

  if (!slot || SITE_CONFIG.googleAdsenseId.includes('XXXX')) return null

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={SITE_CONFIG.googleAdsenseId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}