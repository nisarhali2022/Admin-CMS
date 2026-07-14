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

function getAuthHeader(credentials = {}) {
  const { username, applicationPassword } = credentials || {}
  if (!username || !applicationPassword) return {}
  return {
    Authorization: `Basic ${Buffer.from(`${username}:${applicationPassword}`).toString('base64')}`,
  }
}

const WORDPRESS_PAGE_SIZE = 100
const WORDPRESS_MAX_PAGES = 1000

async function fetchJson(url, credentials) {
  const response = await fetch(url, {
    headers: getAuthHeader(credentials),
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `WordPress REST request failed with status ${response.status} for ${url}. ${body.slice(0, 240)}`,
    )
  }

  try {
    return {
      data: await response.json(),
      headers: response.headers,
    }
  } catch {
    throw new Error(`WordPress REST endpoint returned non-JSON data for ${url}.`)
  }
}

function buildCollectionUrl(baseUrl, type, page, route) {
  const query = `page=${page}&per_page=${WORDPRESS_PAGE_SIZE}&_embed=1`
  if (route === 'rest-route') {
    return `${baseUrl}/?rest_route=/wp/v2/${type}&${query}`
  }
  return `${baseUrl}/wp-json/wp/v2/${type}?${query}`
}

export async function fetchWordPressCollection(baseUrl, type, credentials) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
  const routes = ['wp-json', 'rest-route']
  const errors = []
  const results = []
  let selectedRoute = null

  for (let page = 1; page <= WORDPRESS_MAX_PAGES; page += 1) {
    const candidateRoutes = selectedRoute ? [selectedRoute] : routes
    let pageResult = null

    for (const route of candidateRoutes) {
      const url = buildCollectionUrl(normalizedBaseUrl, type, page, route)

      try {
        const response = await fetchJson(url, credentials)
        if (!Array.isArray(response.data)) {
          throw new Error(
            `WordPress REST endpoint returned an unexpected response for ${url}.`
          )
        }
        pageResult = response
        selectedRoute = route
        break
      } catch (error) {
        errors.push(error.message)
      }
    }

    if (!pageResult) {
      throw new Error(errors.join(' '))
    }

    results.push(...pageResult.data)
    const totalPages = Number(pageResult.headers?.get('x-wp-totalpages'))
    const hasKnownFinalPage = Number.isInteger(totalPages) && totalPages > 0

    if (
      (hasKnownFinalPage && page >= totalPages) ||
      (!hasKnownFinalPage && pageResult.data.length < WORDPRESS_PAGE_SIZE)
    ) {
      return results
    }
  }

  throw new Error(
    `WordPress ${type} import exceeded the ${WORDPRESS_MAX_PAGES}-page safety limit.`
  )
}

export async function fetchWordPressData({ baseUrl, credentials }) {
  const types = ['posts', 'pages', 'categories', 'users', 'media']
  const results = await Promise.all(
    types.map(async (type) => {
      try {
        return { type, value: await fetchWordPressCollection(baseUrl, type, credentials) }
      } catch (error) {
        return { type, error: error.message, value: [] }
      }
    }),
  )
  const data = Object.fromEntries(results.map(({ type, value }) => [type, value]))
  const errors = results
    .filter((result) => result.error)
    .map((result) => ({ type: result.type, message: result.error }))

  const mainContentFailed = results
    .filter((result) => ['posts', 'pages', 'media'].includes(result.type))
    .every((result) => result.error)

  if (mainContentFailed) {
    throw new Error(
      `Unable to read WordPress posts, pages, or media. ${errors
        .map((item) => `${item.type}: ${item.message}`)
        .join(' ')}`,
    )
  }

  return { ...data, errors }
}

export function normalizeWordPressItem(item) {
  const cmsYoast = item?.cms_yoast && typeof item.cms_yoast === 'object'
    ? item.cms_yoast
    : null
  const yoastHead = item?.yoast_head_json && typeof item.yoast_head_json === 'object'
    ? item.yoast_head_json
    : null
  const title = decodeHtml(stripRendered(item.title))
  const bridgeSeoTitle = decodeHtml(cmsYoast?.seoTitle)
  const yoastSeoTitle = decodeHtml(yoastHead?.title)
  const yoastMetaDescription = decodeHtml(yoastHead?.description)
  const bridgeMetaDescription = decodeHtml(cmsYoast?.metaDescription)
  const focusKeyphrase = decodeHtml(cmsYoast?.focusKeyphrase)

  return {
    id: item.id,
    slug: item.slug,
    title,
    contentHtml: stripRendered(item.content),
    status: item.status,
    date: item.date_gmt || item.date,
    authorId: item.author,
    categoryIds: Array.isArray(item.categories) ? item.categories : [],
    featuredMediaId: item.featured_media || null,
    focusKeyphrase: focusKeyphrase || null,
    seoTitle: bridgeSeoTitle || yoastSeoTitle || title || null,
    metaDescription: yoastMetaDescription || bridgeMetaDescription || null,
    seoSources: {
      focusKeyphrase: focusKeyphrase ? 'yoast' : 'missing',
      seoTitle: bridgeSeoTitle
        ? 'yoast'
        : yoastSeoTitle
          ? 'yoast_head_json'
          : title
            ? 'wordpress'
            : 'missing',
      metaDescription: yoastMetaDescription
        ? 'yoast_head_json'
        : bridgeMetaDescription
          ? 'yoast'
          : 'missing',
    },
    yoastBridgeProvided: Boolean(cmsYoast),
  }
}

export function normalizeWordPressUser(user) {
  const name = decodeHtml(stripRendered(user?.name))
  const slug = decodeHtml(stripRendered(user?.slug))
  const bio = decodeHtml(stripRendered(user?.description))

  return {
    id: user?.id,
    name: name || slug,
    slug,
    bio: bio ? bio.slice(0, 2000).trim() : null,
  }
}

export function getEmbeddedFeaturedMedia(item) {
  const embedded = item?._embedded?.['wp:featuredmedia']
  return Array.isArray(embedded) ? embedded[0] || null : null
}

export function getMediaSourceUrl(item) {
  return item?.source_url || item?.guid?.rendered || null
}
