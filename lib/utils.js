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

  return text
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
}

export function truncateText(text, maxLength = 120) {
  if (!text) return ''
  const clean = stripHtml(text)
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

export function getFeaturedImageUrl(post) {
  return (
    post?._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
    post?._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes?.large
      ?.source_url ||
    null
  )
}

export function getFeaturedImageAlt(post) {
  return (
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
