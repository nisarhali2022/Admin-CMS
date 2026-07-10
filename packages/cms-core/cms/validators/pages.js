import { CmsValidationError } from '../http/errors.js'
import { assertMediaId } from './media.js'
import {
  normalizeFocusKeyphrase,
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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function assertPageId(value) {
  return assertMediaId(value)
}

function assertRequiredReferenceId(value, fieldName, label) {
  if (!value) {
    throw new CmsValidationError(`${label} is required.`, {
      code: `${fieldName.toUpperCase()}_REQUIRED`,
      details: { field: fieldName },
    })
  }

  if (!UUID_PATTERN.test(String(value || ''))) {
    throw new CmsValidationError(`Valid ${label.toLowerCase()} ID is required.`, {
      code: `INVALID_${fieldName.toUpperCase()}`,
      details: { field: fieldName },
    })
  }

  return value
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
    focusKeyphrase: normalizeFocusKeyphrase(payload?.focusKeyphrase),
    seoTitle: normalizeRequiredText(payload?.seoTitle, 'SEO title', 180),
    metaDescription: normalizeRequiredText(
      payload?.metaDescription,
      'Meta description',
      300
    ),
    authorId: assertRequiredReferenceId(payload?.authorId, 'authorId', 'Author'),
    canonicalUrl: normalizeUrl(payload?.canonicalUrl, 'canonicalUrl'),
    robotsMeta: normalizeRobotsMeta(payload?.robotsMeta),
    featuredImageId: assertRequiredReferenceId(
      payload?.featuredImageId,
      'featuredImageId',
      'Feature image'
    ),
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
