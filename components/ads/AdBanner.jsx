import AdSenseUnit from './AdSenseUnit'
import { AD_SLOTS } from '@/lib/constants'

export default function AdBanner({ slot = AD_SLOTS.TOP_LEADERBOARD, className = '' }) {
  return (
    <div className={`w-full my-6 ${className}`}>
      <p className="text-center text-xs text-text-muted mb-1 uppercase tracking-wide">
        Advertisement
      </p>
      <AdSenseUnit slot={slot} format="horizontal" />
    </div>
  )
}