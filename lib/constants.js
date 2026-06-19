export const SITE_CONFIG = {
  name: 'Telenor Quiz Today',
  siteName: 'Telenor Quiz Today',
  tagline: "Get today's Telenor Quiz answers and win free internet data daily",
  description:
    'Get all correct Telenor Quiz Today. Check daily updated my Telenor answers today to boost your score instantly and win exciting rewards.',
  url: 'https://telenorquiztoday.com.pk',
  siteUrl: 'https://telenorquiztoday.com.pk',
  locale: 'en_PK',
  defaultOgImage: '/og-default.jpg',
  logoUrl: '/assets/telenor-quiz-today-logo.webp',
  faviconUrl: '/assets/telenor-quiz-favicon.webp',
  googleAnalyticsId:
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-4PK69J6W5W',
  googleAdsenseId:
    process.env.NEXT_PUBLIC_ADSENSE_ID || 'ca-pub-9444471613078101',
  postsPerPage: 10,
  revalidateTime: 3600,
}

export const NAV_LINKS = [
  { label: 'Telenor Quiz Today', href: '/' },
  { label: 'Telenor', href: '/telenor' },
  { label: 'Telecom', href: '/telecom' },
  { label: 'Global', href: '/global' },
  { label: 'Tech', href: '/tech' },
  { label: 'Blog', href: '/blog' },
]

export const AD_SLOTS = {
  TOP_LEADERBOARD:
    process.env.NEXT_PUBLIC_AD_SLOT_TOP || '4404658448',
  BELOW_HEADER:
    process.env.NEXT_PUBLIC_AD_SLOT_MID || '4404658448',
  IN_ARTICLE:
    process.env.NEXT_PUBLIC_AD_SLOT_IN_ARTICLE || '4404658448',
  SIDEBAR:
    process.env.NEXT_PUBLIC_AD_SLOT_SIDEBAR || '4404658448',
  AFTER_CONTENT:
    process.env.NEXT_PUBLIC_AD_SLOT_AFTER_CONTENT || '4404658448',
  BOTTOM:
    process.env.NEXT_PUBLIC_AD_SLOT_BOTTOM || '4404658448',
}

export const AD_POSITIONS = {
  top: AD_SLOTS.TOP_LEADERBOARD,
  mid: AD_SLOTS.BELOW_HEADER,
  bottom: AD_SLOTS.BOTTOM,
  'after-content': AD_SLOTS.AFTER_CONTENT,
}

export function hasConfiguredAdSlot(slot) {
  return Boolean(slot) && !/^(\d)\1{9}$/.test(String(slot))
}

export const CATEGORY_COLORS = [
  'bg-blue-700',
  'bg-green-700',
  'bg-orange-700',
  'bg-purple-700',
  'bg-red-700',
  'bg-teal-700',
  'bg-indigo-700',
  'bg-pink-700',
]
