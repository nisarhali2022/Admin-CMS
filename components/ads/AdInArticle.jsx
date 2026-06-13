import AdSenseUnit from './AdSenseUnit'
import { AD_SLOTS } from '@/lib/constants'

export default function AdInArticle() {
  return (
    <div className="my-8 clear-both">

      <AdSenseUnit slot={AD_SLOTS.IN_ARTICLE} format="fluid" />
    </div>
  )
}