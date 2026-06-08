import { getCategories, getLatestPosts, getMostCommentedPosts } from '@/lib/wordpress'
import { AD_SLOTS } from '@/lib/constants'
import CategoryList from '@/components/widgets/CategoryList'
import RecentPosts from '@/components/widgets/RecentPosts'
import PopularPosts from '@/components/widgets/PopularPosts'
import SearchWidget from '@/components/widgets/SearchWidget'
import AdSenseUnit from '@/components/ads/AdSenseUnit'

export default async function Sidebar() {
  const [categories, recentPosts, popularPosts] = await Promise.all([
    getCategories(),
    getLatestPosts(5),
    getMostCommentedPosts(5),
  ])

  return (
    <aside className="w-full lg:sticky lg:top-20 self-start space-y-0">

      {/* Search */}
      <div className="widget-box">
        <h3 className="section-title">Search</h3>
        <SearchWidget />
      </div>

      {/* Sidebar Ad */}
      <div className="widget-box">
        <p className="text-center text-xs text-text-muted mb-2 uppercase tracking-wide">Advertisement</p>
        <AdSenseUnit slot={AD_SLOTS.SIDEBAR} format="rectangle" />
      </div>

      {/* Categories */}
      <div className="widget-box">
        <h3 className="section-title">Categories</h3>
        <CategoryList categories={categories} />
      </div>

      {/* Recent Posts */}
      <div className="widget-box">
        <h3 className="section-title">Recent Posts</h3>
        <RecentPosts posts={recentPosts} />
      </div>

      {/* Popular Posts */}
      <div className="widget-box">
        <h3 className="section-title">Popular Posts</h3>
        <PopularPosts posts={popularPosts} />
      </div>

    </aside>
  )
}