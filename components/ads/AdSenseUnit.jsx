'use client'

import { useEffect, useRef } from 'react'
import { SITE_CONFIG } from '@/lib/constants'

function isDuplicateAdPushError(error) {
  return /already have ads/i.test(String(error?.message || error))
}

export default function AdSenseUnit({
  slot,
  format = 'auto',
  className = '',
  placementKey,
}) {
  const adRef = useRef(null)

  useEffect(() => {
    const adElement = adRef.current
    if (!adElement) return

    if (
      adElement.dataset.adsbygoogleStatus ||
      adElement.dataset.adStatus ||
      adElement.dataset.adPushed
    ) {
      return
    }

    adElement.dataset.adPushed = 'true'

    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (error) {
      if (!isDuplicateAdPushError(error)) {
        console.warn('AdSense push failed', error)
      }
    }
  }, [])

  return (
    <div className={className}>
      <ins
        ref={adRef}
        key={placementKey}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={SITE_CONFIG.googleAdsenseId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
        data-ad-placement={placementKey}
      />
    </div>
  )
}
