import { CATEGORY_COLORS } from './constants'

export function formatDate(dateString) {
  if (!dateString) return ''
  try {
    return new Intl.DateTimeFormat('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateString))
  } catch {
    return dateString
  }
}

export function calculateReadingTime(htmlContent) {
  if (!htmlContent) return '1 min read'
  const text = htmlContent.replace(/<[^>]+>/g, ' ')
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const minutes = Math.ceil(words / 200)
  return `${Math.max(1, minutes)} min read`
}

export function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function decodeHtmlEntities(text) {
  if (!text) return ''

  const decodeCodePoint = (value, radix, fallback) => {
    const codePoint = Number.parseInt(value, radix)
    return Number.isInteger(codePoint) &&
      codePoint >= 0 &&
      codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : fallback
  }
  const namedEntities = {
    nbsp: ' ',
    ndash: '–',
    mdash: '—',
    hellip: '…',
    lsquo: '‘',
    rsquo: '’',
    ldquo: '“',
    rdquo: '”',
  }

  return String(text)
    .replace(/&#x([0-9a-f]+);/gi, (entity, value) =>
      decodeCodePoint(value, 16, entity)
    )
    .replace(/&#([0-9]+);/g, (entity, value) =>
      decodeCodePoint(value, 10, entity)
    )
    .replace(
      /&(nbsp|ndash|mdash|hellip|lsquo|rsquo|ldquo|rdquo);/gi,
      (_, name) => namedEntities[name.toLowerCase()]
    )
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
}

export function toPlainText(value) {
  return stripHtml(decodeHtmlEntities(String(value || '')))
}

export function truncateText(text, maxLength = 120) {
  if (!text) return ''
  const clean = toPlainText(text)
  if (clean.length <= maxLength) return clean
  return clean.slice(0, maxLength).trim() + '…'
}

export function getCategoryColor(slug) {
  if (!slug) return CATEGORY_COLORS[0]
  const sum = slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return CATEGORY_COLORS[sum % CATEGORY_COLORS.length]
}

export function injectAdAfterFirstParagraph(htmlContent, adHtml) {
  if (!htmlContent || !adHtml) return htmlContent
  const firstPEnd = htmlContent.indexOf('</p>')
  if (firstPEnd === -1) return htmlContent
  return (
    htmlContent.slice(0, firstPEnd + 4) +
    adHtml +
    htmlContent.slice(firstPEnd + 4)
  )
}

export function getExcerpt(post, maxLength = 120) {
  const excerpt = post?.excerpt?.rendered || post?.content?.rendered || ''
  return truncateText(excerpt, maxLength)
}

export function getFeaturedImageUrl(post, preferredSize = 'large') {
  const media = post?._embedded?.['wp:featuredmedia']?.[0]
  const sizes = media?.media_details?.sizes || {}
  return (
    sizes?.[preferredSize]?.source_url ||
    sizes?.large?.source_url ||
    sizes?.medium_large?.source_url ||
    media?.source_url ||
    null
  )
}

export function getFeaturedImageAlt(post) {
  return toPlainText(
    post?._embedded?.['wp:featuredmedia']?.[0]?.alt_text ||
    post?.title?.rendered ||
    ''
  )
}

export function getPostAuthor(post) {
  return post?._embedded?.['author']?.[0] || null
}

export function getPostCategories(post) {
  return post?._embedded?.['wp:term']?.[0] || []
}

export function getFirstCategory(post) {
  const cats = getPostCategories(post)
  return cats.find((c) => c.taxonomy === 'category') || null
}

export function getAuthorPath(author) {
  const slug = author?.slug || String(author?.name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug ? `/author/${slug}` : '/about-us'
}

export function optimizeContentImages(html = '') {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    let optimized = tag
    if (!/\bloading\s*=/i.test(optimized)) {
      optimized = optimized.replace('<img', '<img loading="lazy"')
    }
    if (!/\bdecoding\s*=/i.test(optimized)) {
      optimized = optimized.replace('<img', '<img decoding="async"')
    }
    return optimized
  })
}
