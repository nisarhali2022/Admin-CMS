import { CmsValidationError } from '../http/errors.js'
import { assertMediaId } from './media.js'
import {
  normalizeOptionalMediaId,
  normalizeOptionalText,
  normalizeRequiredText,
  slugify,
} from './taxonomy.js'

const ROBOTS_META_VALUES = new Set([
  'index,follow',
  'noindex,follow',
  'index,nofollow',
  'noindex,nofollow',
])

export function assertPageId(value) {
  return assertMediaId(value)
}

function normalizeRobotsMeta(value) {
  const text = normalizeOptionalText(value, 'robotsMeta', 60)
  if (!text) return null

  if (!ROBOTS_META_VALUES.has(text)) {
    throw new CmsValidationError('Invalid robots meta value.', {
      code: 'INVALID_ROBOTS_META',
      details: { allowed: [...ROBOTS_META_VALUES] },
    })
  }

  return text
}

function normalizeUrl(value, fieldName) {
  const text = normalizeOptionalText(value, fieldName, 500)
  if (!text) return null

  if (text.startsWith('/') || text.startsWith('http://') || text.startsWith('https://')) {
    return text
  }

  throw new CmsValidationError(`${fieldName} must be an absolute URL or relative path.`, {
    code: 'INVALID_URL',
    details: { field: fieldName },
  })
}

export function normalizePagePath(value, title) {
  const raw = typeof value === 'string' ? value.trim() : ''
  const source = raw || slugify(title)
  const path = source.startsWith('/') ? source : `/${source}`

  if (path === '/') {
    throw new CmsValidationError('/ is reserved for the fixed Home page.', {
      code: 'RESERVED_PAGE_PATH',
    })
  }

  if (path.includes('://') || !path.startsWith('/')) {
    throw new CmsValidationError('Page path must be a relative path.', {
      code: 'INVALID_PAGE_PATH',
    })
  }

  if (!/^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(path)) {
    throw new CmsValidationError('Valid page slug is required.', {
      code: 'INVALID_PAGE_PATH',
    })
  }

  return path
}

function normalizePageFields(payload) {
  const title = normalizeRequiredText(payload?.title, 'title', 180)

  return {
    title,
    path: normalizePagePath(payload?.path, title),
    bodyText: normalizeOptionalText(payload?.bodyText, 'bodyText', 20000) || '',
    focusKeyphrase: normalizeOptionalText(payload?.focusKeyphrase, 'focusKeyphrase', 180),
    seoTitle: normalizeOptionalText(payload?.seoTitle, 'seoTitle', 180),
    metaDescription: normalizeOptionalText(
      payload?.metaDescription,
      'metaDescription',
      300
    ),
    authorId: payload?.authorId ? assertMediaId(payload.authorId) : null,
    canonicalUrl: normalizeUrl(payload?.canonicalUrl, 'canonicalUrl'),
    robotsMeta: normalizeRobotsMeta(payload?.robotsMeta),
    featuredImageId: normalizeOptionalMediaId(payload?.featuredImageId),
    sitemapInclude:
      typeof payload?.sitemapInclude === 'boolean' ? payload.sitemapInclude : true,
  }
}

export function validatePagePayload(payload) {
  return normalizePageFields(payload)
}

export function validatePagePatchPayload(payload) {
  return normalizePageFields(payload)
}
