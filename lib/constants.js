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
  googleAdsenseId:
    process.env.NEXT_PUBLIC_ADSENSE_ID || 'ca-pub-XXXXXXXXXXXXXXXXX',
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
    process.env.NEXT_PUBLIC_AD_SLOT_TOP || '1111111111',
  BELOW_HEADER:
    process.env.NEXT_PUBLIC_AD_SLOT_MID || '2222222222',
  IN_ARTICLE:
    process.env.NEXT_PUBLIC_AD_SLOT_IN_ARTICLE || '3333333333',
  SIDEBAR:
    process.env.NEXT_PUBLIC_AD_SLOT_SIDEBAR || '4444444444',
  AFTER_CONTENT:
    process.env.NEXT_PUBLIC_AD_SLOT_AFTER_CONTENT || '5555555555',
  BOTTOM:
    process.env.NEXT_PUBLIC_AD_SLOT_BOTTOM || '6666666666',
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
