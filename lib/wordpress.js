import { SITE_CONFIG } from './constants'

const API = SITE_CONFIG.wpApiUrl
const REVALIDATE = SITE_CONFIG.revalidateTime

async function getPostIdsBySlugs(slugs = []) {
  const uniqueSlugs = [...new Set(slugs.filter(Boolean))]
  if (uniqueSlugs.length === 0) return []

  const posts = await Promise.all(
    uniqueSlugs.map(async (slug) => {
      try {
        const params = new URLSearchParams({
          slug,
          per_page: '1',
          _fields: 'id,slug',
        })
        const res = await fetch(`${API}/posts?${params}`, {
          next: {
            revalidate: REVALIDATE,
            ...(slug === 'daily-quiz' && { tags: ['quiz'] }),
          },
        })
        if (!res.ok) return null
        const matches = await res.json()
        return matches?.[0] || null
      } catch {
        return null
      }
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
  try {
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
    
    // Add cache tag if provided
    if (tag) {
      fetchOptions.next.tags = [tag]
    }

    const res = await fetch(`${API}/posts?${params}`, fetchOptions)
    if (!res.ok) return { posts: [], totalPages: 0, total: 0 }
    let posts = await res.json()
    
    // Fallback only for slugs that could not be resolved before the query.
    if (unresolvedSlugs.length > 0) {
      posts = posts.filter(post => !unresolvedSlugs.includes(post.slug))
    }
    
    const totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '0')
    const total = parseInt(res.headers.get('X-WP-Total') || '0')
    return { posts, totalPages, total }
  } catch {
    return { posts: [], totalPages: 0, total: 0 }
  }
}

export async function getPostsByCategory(categoryId, page = 1, perPage = 10, excludeSlugs = ['daily-quiz']) {
  return getPosts({ page, perPage, categoryId, excludeSlugs })
}

export async function getPostBySlug(slug) {
  try {
    const res = await fetch(`${API}/posts?_embed&slug=${slug}`, {
      next: { revalidate: REVALIDATE },
    })
    if (!res.ok) return null
    const posts = await res.json()
    return posts?.[0] || null
  } catch {
    return null
  }
}

export async function getDailyQuizPost() {
  try {
    const res = await fetch(`${API}/posts?_embed&slug=daily-quiz`, {
      next: { revalidate: REVALIDATE, tags: ['quiz'] },
    })
    if (!res.ok) return null
    const posts = await res.json()
    return posts?.[0] || null
  } catch {
    return null
  }
}

export async function getLatestPosts(count = 5) {
  try {
    const { posts } = await getPosts({
      perPage: count,
      excludeSlugs: ['daily-quiz'],
    })
    return posts
  } catch {
    return []
  }
}

export async function getMostCommentedPosts(count = 5) {
  try {
    const excludedPosts = await getPostIdsBySlugs(['daily-quiz'])
    const params = new URLSearchParams({
      _embed: 'true',
      per_page: String(count),
      orderby: 'comment_count',
      order: 'desc',
    })
    if (excludedPosts.length > 0) {
      params.set('exclude', excludedPosts.map((post) => post.id).join(','))
    }

    const res = await fetch(
      `${API}/posts?${params}`,
      { next: { revalidate: REVALIDATE } }
    )
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function getRelatedPosts(categoryId, excludePostId, count = 3) {
  try {
    const res = await fetch(
      `${API}/posts?_embed&categories=${categoryId}&exclude=${excludePostId}&per_page=${count}`,
      { next: { revalidate: REVALIDATE } }
    )
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function getCategories() {
  try {
    const res = await fetch(
      `${API}/categories?exclude=1&orderby=count&order=desc&per_page=100`,
      { next: { revalidate: REVALIDATE } }
    )
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function getCategoryBySlug(slug) {
  try {
    const res = await fetch(`${API}/categories?slug=${slug}`, {
      next: { revalidate: REVALIDATE },
    })
    if (!res.ok) return null
    const cats = await res.json()
    return cats?.[0] || null
  } catch {
    return null
  }
}

export async function getTagBySlug(slug) {
  try {
    const res = await fetch(`${API}/tags?slug=${slug}`, {
      next: { revalidate: REVALIDATE },
    })
    if (!res.ok) return null
    const tags = await res.json()
    return tags?.[0] || null
  } catch {
    return null
  }
}

export async function getPageBySlug(slug) {
  try {
    const res = await fetch(`${API}/pages?_embed&slug=${slug}`, {
      next: { revalidate: REVALIDATE },
    })
    if (!res.ok) return null
    const pages = await res.json()
    return pages?.[0] || null
  } catch {
    return null
  }
}

export async function searchPosts(query, page = 1, perPage = 10) {
  try {
    return await getPosts({
      search: query,
      page,
      perPage,
      excludeSlugs: ['daily-quiz'],
      cacheSeconds: 60,
    })
  } catch {
    return { posts: [], totalPages: 0, total: 0 }
  }
}

export async function getComments(postId) {
  try {
    const res = await fetch(
      `${API}/comments?post=${postId}&status=approved&per_page=50&orderby=date&order=asc`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function getAllPostSlugs() {
  const allSlugs = []
  let page = 1
  while (true) {
    try {
      const res = await fetch(
        `${API}/posts?per_page=100&page=${page}&_fields=slug,modified`,
        { next: { revalidate: REVALIDATE } }
      )
      if (!res.ok) break
      const posts = await res.json()
      if (!posts || posts.length === 0) break
      allSlugs.push(...posts.map((p) => ({ slug: p.slug, modified: p.modified })))
      const totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1')
      if (page >= totalPages) break
      page++
    } catch {
      break
    }
  }
  return allSlugs
}

export async function getAllCategorySlugs() {
  try {
    const res = await fetch(
      `${API}/categories?exclude=1&per_page=100&_fields=slug`,
      { next: { revalidate: REVALIDATE } }
    )
    if (!res.ok) return []
    const cats = await res.json()
    return cats.map((c) => ({ slug: c.slug }))
  } catch {
    return []
  }
}
