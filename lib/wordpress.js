import { SITE_CONFIG } from './constants'
import { WORDPRESS_API_URL } from './wordpressConfig'

const API = WORDPRESS_API_URL
const REVALIDATE = SITE_CONFIG.revalidateTime
const RETRY_DELAY_MS = 250

export class WordPressApiError extends Error {
  constructor(message, { url, status, cause } = {}) {
    super(message, { cause })
    this.name = 'WordPressApiError'
    this.url = url
    this.status = status
  }
}

function shouldRetry(status) {
  return status === 429 || status >= 500
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function wordpressFetch(url, options = {}, context = 'WordPress request') {
  let lastError

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, options)

      if (response.ok) return response

      const error = new WordPressApiError(
        `${context} failed with status ${response.status}.`,
        { url, status: response.status }
      )

      if (!shouldRetry(response.status) || attempt === 2) throw error
      lastError = error
    } catch (error) {
      const normalizedError =
        error instanceof WordPressApiError
          ? error
          : new WordPressApiError(`${context} could not reach WordPress.`, {
              url,
              cause: error,
            })

      if (
        attempt === 2 ||
        (normalizedError.status && !shouldRetry(normalizedError.status))
      ) {
        console.error('WordPress API unavailable', {
          context,
          url,
          status: normalizedError.status || null,
          message: normalizedError.message,
        })
        throw normalizedError
      }

      lastError = normalizedError
    }

    await wait(RETRY_DELAY_MS)
  }

  throw lastError
}

async function wordpressJson(url, options = {}, context = 'WordPress request') {
  let lastError

  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await wordpressFetch(url, options, context)

    try {
      return {
        data: await response.json(),
        response,
      }
    } catch (error) {
      lastError = new WordPressApiError(
        `${context} returned invalid JSON.`,
        { url, status: response.status, cause: error }
      )

      if (attempt === 2) {
        console.error('WordPress API returned invalid JSON', {
          context,
          url,
          status: response.status,
          message: lastError.message,
        })
        throw lastError
      }

      await wait(RETRY_DELAY_MS)
    }
  }

  throw lastError
}

async function getPostIdsBySlugs(slugs = []) {
  const uniqueSlugs = [...new Set(slugs.filter(Boolean))]
  if (uniqueSlugs.length === 0) return []

  const posts = await Promise.all(
    uniqueSlugs.map(async (slug) => {
      const params = new URLSearchParams({
        slug,
        per_page: '1',
        _fields: 'id,slug',
      })
      const { data: matches } = await wordpressJson(
        `${API}/posts?${params}`,
        {
          next: {
            revalidate: REVALIDATE,
            ...(slug === 'daily-quiz' && { tags: ['quiz'] }),
          },
        },
        `Resolve post slug "${slug}"`
      )
      return matches?.[0] || null
    })
  )

  return posts.filter(Boolean)
}

export async function getPosts({
  page = 1,
  perPage = 10,
  categoryId,
  tagId,
  search,
  excludeSlugs = [],
  tag,
  cacheSeconds = REVALIDATE,
} = {}) {
  const excludedPosts = await getPostIdsBySlugs(excludeSlugs)
  const excludedIds = excludedPosts.map((post) => post.id)
  const resolvedSlugs = new Set(excludedPosts.map((post) => post.slug))
  const unresolvedSlugs = excludeSlugs.filter(
    (slug) => !resolvedSlugs.has(slug)
  )

  const params = new URLSearchParams({
    _embed: 'true',
    page: String(page),
    per_page: String(perPage),
  })
  if (categoryId) params.set('categories', String(categoryId))
  if (tagId) params.set('tags', String(tagId))
  if (search) params.set('search', search)
  if (excludedIds.length > 0) params.set('exclude', excludedIds.join(','))

  const fetchOptions = {
    next: { revalidate: cacheSeconds },
  }

  if (tag) fetchOptions.next.tags = [tag]

  const { data, response } = await wordpressJson(
    `${API}/posts?${params}`,
    fetchOptions,
    'Fetch posts'
  )
  let posts = data

  // Fallback only for slugs that could not be resolved before the query.
  if (unresolvedSlugs.length > 0) {
    posts = posts.filter((post) => !unresolvedSlugs.includes(post.slug))
  }

  const totalPages = parseInt(
    response.headers.get('X-WP-TotalPages') || '0'
  )
  const total = parseInt(response.headers.get('X-WP-Total') || '0')
  return { posts, totalPages, total }
}

export async function getPostsByCategory(categoryId, page = 1, perPage = 10, excludeSlugs = ['daily-quiz']) {
  return getPosts({ page, perPage, categoryId, excludeSlugs })
}

export async function getPostBySlug(slug) {
  const { data: posts } = await wordpressJson(
    `${API}/posts?_embed&slug=${encodeURIComponent(slug)}`,
    { next: { revalidate: REVALIDATE } },
    `Fetch post "${slug}"`
  )
  return posts?.[0] || null
}

export async function getDailyQuizPost() {
  const { data: posts } = await wordpressJson(
    `${API}/posts?_embed&slug=daily-quiz`,
    {
      next: { revalidate: REVALIDATE, tags: ['quiz'] },
    },
    'Fetch daily quiz'
  )
  return posts?.[0] || null
}

export async function getLatestPosts(count = 5) {
  const { posts } = await getPosts({
    perPage: count,
    excludeSlugs: ['daily-quiz'],
  })
  return posts
}

export async function getMostCommentedPosts(count = 5) {
  const excludedPosts = await getPostIdsBySlugs(['daily-quiz'])
  const excludedIds = new Set(excludedPosts.map((post) => post.id))
  const { data: comments } = await wordpressJson(
    `${API}/comments?per_page=100&orderby=date&order=desc&_fields=post`,
    { next: { revalidate: 300 } },
    'Fetch recent comment activity'
  )

  const commentCounts = new Map()
  for (const comment of comments) {
    if (!comment.post || excludedIds.has(comment.post)) continue
    commentCounts.set(comment.post, (commentCounts.get(comment.post) || 0) + 1)
  }

  const rankedIds = [...commentCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([postId]) => postId)

  let popularPosts = []
  if (rankedIds.length > 0) {
    const params = new URLSearchParams({
      _embed: 'true',
      include: rankedIds.join(','),
      orderby: 'include',
      per_page: String(rankedIds.length),
    })
    const { data } = await wordpressJson(
      `${API}/posts?${params}`,
      { next: { revalidate: 300 } },
      'Fetch posts with recent comment activity'
    )
    popularPosts = data
  }

  if (popularPosts.length >= count) return popularPosts

  const latestPosts = await getLatestPosts(count)
  const existingIds = new Set(popularPosts.map((post) => post.id))

  return [
    ...popularPosts,
    ...latestPosts.filter((post) => !existingIds.has(post.id)),
  ].slice(0, count)
}

export async function getRelatedPosts(categoryId, excludePostId, count = 3) {
  const { data } = await wordpressJson(
    `${API}/posts?_embed&categories=${categoryId}&exclude=${excludePostId}&per_page=${count}`,
    { next: { revalidate: REVALIDATE } },
    'Fetch related posts'
  )
  return data
}

export async function getCategories() {
  const { data } = await wordpressJson(
    `${API}/categories?exclude=1&orderby=count&order=desc&per_page=100`,
    { next: { revalidate: REVALIDATE } },
    'Fetch categories'
  )
  return data
}

export async function getCategoryBySlug(slug) {
  const { data: cats } = await wordpressJson(
    `${API}/categories?slug=${encodeURIComponent(slug)}`,
    { next: { revalidate: REVALIDATE } },
    `Fetch category "${slug}"`
  )
  return cats?.[0] || null
}

export async function getTagBySlug(slug) {
  const { data: tags } = await wordpressJson(
    `${API}/tags?slug=${encodeURIComponent(slug)}`,
    { next: { revalidate: REVALIDATE } },
    `Fetch tag "${slug}"`
  )
  return tags?.[0] || null
}

export async function getPageBySlug(slug) {
  const { data: pages } = await wordpressJson(
    `${API}/pages?_embed&slug=${encodeURIComponent(slug)}`,
    { next: { revalidate: REVALIDATE } },
    `Fetch page "${slug}"`
  )
  return pages?.[0] || null
}

export async function searchPosts(query, page = 1, perPage = 10) {
  return await getPosts({
    search: query,
    page,
    perPage,
    excludeSlugs: ['daily-quiz'],
    cacheSeconds: 60,
  })
}

export async function getAllPostSlugs() {
  const allSlugs = []
  let page = 1
  while (true) {
    const { data: posts, response } = await wordpressJson(
      `${API}/posts?per_page=100&page=${page}&_fields=slug,modified`,
      { next: { revalidate: REVALIDATE } },
      `Fetch post slugs page ${page}`
    )
    if (!posts || posts.length === 0) break
    allSlugs.push(...posts.map((p) => ({ slug: p.slug, modified: p.modified })))
    const totalPages = parseInt(
      response.headers.get('X-WP-TotalPages') || '1'
    )
    if (page >= totalPages) break
    page++
  }
  return allSlugs
}

export async function getAllCategorySlugs() {
  const { data: cats } = await wordpressJson(
    `${API}/categories?exclude=1&per_page=100&_fields=slug`,
    { next: { revalidate: REVALIDATE } },
    'Fetch category slugs'
  )
  return cats.map((c) => ({ slug: c.slug }))
}
