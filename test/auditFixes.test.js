import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

test('special WordPress pages strip body h1 blocks before rendering content', () => {
  const about = read('app/about-us/page.jsx')
  const privacy = read('app/privacy-policy/page.jsx')

  assert.match(about, /removeContentH1Blocks/)
  assert.match(privacy, /removeContentH1Blocks/)
})

test('contact page uses a stable descriptive meta description', () => {
  const contact = read('app/contact-us/page.jsx')

  assert.match(contact, /questions, corrections, feedback, and support/)
  assert.doesNotMatch(contact, /truncateText\(page\.excerpt/)
})

test('sidebar offset matches fixed header spacing and old search block is removed', () => {
  const sidebar = read('components/layout/Sidebar.jsx')

  assert.match(sidebar, /lg:top-28/)
  assert.doesNotMatch(sidebar, /SearchWidget/)
})

test('dead footer and sidebar search files are removed', () => {
  assert.equal(existsSync('components/layout/FooterRecentPosts.jsx'), false)
  assert.equal(existsSync('components/widgets/SearchWidget.jsx'), false)
  assert.equal(existsSync('hooks/useSearch.js'), false)
})

test('ad slots are static literal values', () => {
  const constants = read('lib/constants.js')

  assert.doesNotMatch(constants, /NEXT_PUBLIC_AD_SLOT_/)
  assert.doesNotMatch(constants, /process\.env\[['"]NEXT_PUBLIC_AD_SLOT_/)
  assert.match(constants, /TOP_LEADERBOARD:\s*'4404658448'/)
  assert.match(constants, /BELOW_HEADER:\s*'4404658448'/)
  assert.match(constants, /IN_ARTICLE:\s*'4404658448'/)
  assert.match(constants, /SIDEBAR:\s*'4404658448'/)
  assert.match(constants, /AFTER_CONTENT:\s*'4404658448'/)
  assert.match(constants, /BOTTOM:\s*'4404658448'/)
})

test('unfilled non-top ad containers can collapse after AdSense reports unfilled', () => {
  const adSenseUnit = read('components/ads/AdSenseUnit.jsx')
  const adBanner = read('components/ads/AdBanner.jsx')
  const globals = read('styles/globals.css')

  assert.match(adSenseUnit, /MutationObserver/)
  assert.match(adSenseUnit, /data-ad-status/)
  assert.match(adBanner, /data-collapse-unfilled/)
  assert.match(globals, /data-ad-container-status="unfilled"/)
})

test('next image config allows all image quality values used by components', () => {
  const config = read('next.config.js')
  const latestNewsGrid = read('components/home/LatestNewsGrid.jsx')
  const postCard = read('components/posts/PostCard.jsx')
  const featuredImage = read('components/posts/FeaturedImage.jsx')

  assert.match(config, /qualities:\s*\[60,\s*70,\s*75\]/)
  assert.match(latestNewsGrid, /quality=\{60\}/)
  assert.match(postCard, /quality=\{60\}/)
  assert.match(featuredImage, /quality = 70/)
})

test('adsense script uses native script tag to avoid Next data-nscript warning', () => {
  const layout = read('app/layout.jsx')

  assert.match(layout, /<script\s+[\s\S]*pagead2\.googlesyndication\.com/)
  assert.doesNotMatch(
    layout,
    /<Script\b[^>]*pagead2\.googlesyndication\.com[^>]*>/
  )
})
