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
    const adContainer = adElement.closest('[data-ad-container]')

    const updateContainerStatus = () => {
      if (
        adContainer?.dataset.collapseUnfilled === 'true' &&
        adElement.dataset.adStatus === 'unfilled'
      ) {
        adContainer.dataset.adContainerStatus = 'unfilled'
      }
    }

    const observer = new MutationObserver(updateContainerStatus)
    observer.observe(adElement, {
      attributes: true,
      attributeFilter: ['data-ad-status'],
    })

    if (
      adElement.dataset.adsbygoogleStatus ||
      adElement.dataset.adStatus ||
      adElement.dataset.adPushed
    ) {
      updateContainerStatus()
      observer.disconnect()
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

    updateContainerStatus()

    return () => observer.disconnect()
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
