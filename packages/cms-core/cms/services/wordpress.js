function stripRendered(value) {
  if (typeof value === 'string') return value
  if (typeof value?.rendered === 'string') return value.rendered
  return ''
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '-')
    .replace(/&#8217;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/<[^>]+>/g, '')
    .trim()
}

function getAuthHeader({ username, applicationPassword } = {}) {
  if (!username || !applicationPassword) return {}
  return {
    Authorization: `Basic ${Buffer.from(`${username}:${applicationPassword}`).toString('base64')}`,
  }
}

async function fetchJson(url, credentials) {
  const response = await fetch(url, {
    headers: getAuthHeader(credentials),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`WordPress REST request failed with status ${response.status}.`)
  }

  return response.json()
}

export async function fetchWordPressCollection(baseUrl, type, credentials) {
  const url = `${baseUrl.replace(/\/$/, '')}/wp-json/wp/v2/${type}?per_page=100&_embed=1`
  const result = await fetchJson(url, credentials)
  return Array.isArray(result) ? result : []
}

export async function fetchWordPressData({ baseUrl, credentials }) {
  const [posts, pages, categories, users, media] = await Promise.all([
    fetchWordPressCollection(baseUrl, 'posts', credentials).catch(() => []),
    fetchWordPressCollection(baseUrl, 'pages', credentials).catch(() => []),
    fetchWordPressCollection(baseUrl, 'categories', credentials).catch(() => []),
    fetchWordPressCollection(baseUrl, 'users', credentials).catch(() => []),
    fetchWordPressCollection(baseUrl, 'media', credentials).catch(() => []),
  ])

  return { posts, pages, categories, users, media }
}

export function normalizeWordPressItem(item) {
  return {
    id: item.id,
    slug: item.slug,
    title: decodeHtml(stripRendered(item.title)),
    excerpt: decodeHtml(stripRendered(item.excerpt)),
    contentHtml: stripRendered(item.content),
    status: item.status,
    date: item.date_gmt || item.date,
    authorId: item.author,
    categoryIds: Array.isArray(item.categories) ? item.categories : [],
    featuredMediaId: item.featured_media || null,
  }
}

export function getEmbeddedFeaturedMedia(item) {
  const embedded = item?._embedded?.['wp:featuredmedia']
  return Array.isArray(embedded) ? embedded[0] || null : null
}

export function getMediaSourceUrl(item) {
  return item?.source_url || item?.guid?.rendered || null
}
