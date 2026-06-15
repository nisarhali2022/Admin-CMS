import AdSenseUnit from './AdSenseUnit'
import {
  AD_POSITIONS,
  AD_SLOTS,
  hasConfiguredAdSlot,
  SITE_CONFIG,
} from '@/lib/constants'

export default function AdBanner({
  position = 'top',
  slot,
  className = '',
}) {
  const resolvedSlot = slot || AD_POSITIONS[position] || AD_SLOTS.TOP_LEADERBOARD
  const isConfigured =
    SITE_CONFIG.googleAdsenseId &&
    !SITE_CONFIG.googleAdsenseId.includes('XXXX') &&
    hasConfiguredAdSlot(resolvedSlot)

  if (!isConfigured) return null

  return (
    <div
      className={`my-6 min-h-[100px] w-full overflow-hidden ${className}`}
      aria-label="Advertisement"
    >
      <AdSenseUnit slot={resolvedSlot} format="horizontal" />
    </div>
  )
}
