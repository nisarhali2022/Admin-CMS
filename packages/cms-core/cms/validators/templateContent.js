import { CmsValidationError } from '../http/errors.js'
import {
  SUPPORTED_TEMPLATE_KEYS,
  TEMPLATE_CONTENT_SCHEMAS,
  getDefaultTemplateContentData,
} from '../schemas/templateContent.js'
import { assertMediaId } from './media.js'
import {
  normalizeFocusKeyphrase,
  normalizeOptionalText,
  normalizeRequiredText,
} from './taxonomy.js'

const ROBOTS_META_VALUES = new Set([
  'index,follow',
  'noindex,follow',
  'index,nofollow',
  'noindex,nofollow',
])

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function assertTemplateContentId(value) {
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

function normalizeTemplateKey(value) {
  const templateKey = typeof value === 'string' ? value.trim() : ''

  if (!SUPPORTED_TEMPLATE_KEYS.includes(templateKey)) {
    throw new CmsValidationError('Unsupported template key.', {
      code: 'UNSUPPORTED_TEMPLATE_KEY',
      details: { supported: SUPPORTED_TEMPLATE_KEYS },
    })
  }

  return templateKey
}

function normalizePath(value, templateKey) {
  const fallback = TEMPLATE_CONTENT_SCHEMAS[templateKey]?.defaultPath || '/'
  const path = typeof value === 'string' && value.trim() ? value.trim() : fallback

  if (!path.startsWith('/')) {
    throw new CmsValidationError('Template path must start with /.', {
      code: 'INVALID_TEMPLATE_PATH',
    })
  }

  if (path.includes('://')) {
    throw new CmsValidationError('Template path must be relative.', {
      code: 'INVALID_TEMPLATE_PATH',
    })
  }

  return path
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

function assertNoScheduling(payload) {
  if (
    Object.hasOwn(payload || {}, 'scheduledFor') ||
    Object.hasOwn(payload || {}, 'scheduled_for')
  ) {
    throw new CmsValidationError('Template content scheduling is not supported in v1.', {
      code: 'TEMPLATE_SCHEDULING_UNSUPPORTED',
    })
  }
}

export function collectMediaIds(value, result = new Set()) {
  if (!value || typeof value !== 'object') return result

  if (Array.isArray(value)) {
    for (const item of value) collectMediaIds(item, result)
    return result
  }

  if (Object.hasOwn(value, 'mediaId') && value.mediaId) {
    result.add(assertMediaId(value.mediaId))
  }

  for (const child of Object.values(value)) {
    collectMediaIds(child, result)
  }

  return result
}

function validateContentData(templateKey, contentData) {
  const schema = TEMPLATE_CONTENT_SCHEMAS[templateKey]
  const input =
    contentData && typeof contentData === 'object' && !Array.isArray(contentData)
      ? contentData
      : getDefaultTemplateContentData(templateKey)
  const allowedFields = new Set([...schema.textFields, ...schema.imageFields])
  const normalized = {}

  for (const key of Object.keys(input)) {
    if (!allowedFields.has(key)) {
      throw new CmsValidationError(`Unexpected content field: ${key}.`, {
        code: 'UNEXPECTED_TEMPLATE_FIELD',
        details: { field: key, allowed: [...allowedFields] },
      })
    }
  }

  for (const field of schema.textFields) {
    normalized[field] = normalizeOptionalText(input[field], field, 5000) || ''
  }

  for (const field of schema.imageFields) {
    const imageValue = input[field]
    const mediaId =
      imageValue && typeof imageValue === 'object' ? imageValue.mediaId : null

    normalized[field] = { mediaId: mediaId ? assertMediaId(mediaId) : null }
  }

  return normalized
}

export function validateTemplateContentPayload(payload) {
  assertNoScheduling(payload)
  const templateKey = normalizeTemplateKey(payload?.templateKey)
  const title = normalizeRequiredText(
    payload?.title || TEMPLATE_CONTENT_SCHEMAS[templateKey].defaultTitle,
    'title',
    180
  )
  const contentData = validateContentData(templateKey, payload?.contentData)

  return {
    templateKey,
    path: normalizePath(payload?.path, templateKey),
    title,
    contentData,
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
    ogImageId: assertRequiredReferenceId(
      payload?.ogImageId,
      'featuredImageId',
      'Feature image'
    ),
    sitemapInclude:
      typeof payload?.sitemapInclude === 'boolean' ? payload.sitemapInclude : true,
  }
}

export function validateTemplateContentPatchPayload(payload) {
  assertNoScheduling(payload)
  const templateKey = payload?.templateKey
    ? normalizeTemplateKey(payload.templateKey)
    : null
  const result = {}

  if (templateKey) result.templateKey = templateKey
  if (Object.hasOwn(payload || {}, 'path')) {
    result.path = normalizePath(payload.path, templateKey || 'home')
  }
  if (Object.hasOwn(payload || {}, 'title')) {
    result.title = normalizeRequiredText(payload.title, 'title', 180)
  }
  if (Object.hasOwn(payload || {}, 'contentData')) {
    if (!templateKey) {
      throw new CmsValidationError('templateKey is required when updating contentData.', {
        code: 'TEMPLATE_KEY_REQUIRED',
      })
    }
    result.contentData = validateContentData(templateKey, payload.contentData)
  }
  if (Object.hasOwn(payload || {}, 'focusKeyphrase')) {
    result.focusKeyphrase = normalizeFocusKeyphrase(payload.focusKeyphrase)
  }
  if (Object.hasOwn(payload || {}, 'seoTitle')) {
    result.seoTitle = normalizeRequiredText(payload.seoTitle, 'SEO title', 180)
  }
  if (Object.hasOwn(payload || {}, 'metaDescription')) {
    result.metaDescription = normalizeRequiredText(
      payload.metaDescription,
      'Meta description',
      300
    )
  }
  if (Object.hasOwn(payload || {}, 'authorId')) {
    result.authorId = assertRequiredReferenceId(payload.authorId, 'authorId', 'Author')
  }
  if (Object.hasOwn(payload || {}, 'canonicalUrl')) {
    result.canonicalUrl = normalizeUrl(payload.canonicalUrl, 'canonicalUrl')
  }
  if (Object.hasOwn(payload || {}, 'robotsMeta')) {
    result.robotsMeta = normalizeRobotsMeta(payload.robotsMeta)
  }
  if (Object.hasOwn(payload || {}, 'ogImageId')) {
    result.ogImageId = assertRequiredReferenceId(
      payload.ogImageId,
      'featuredImageId',
      'Feature image'
    )
  }
  if (Object.hasOwn(payload || {}, 'sitemapInclude')) {
    result.sitemapInclude =
      typeof payload.sitemapInclude === 'boolean' ? payload.sitemapInclude : true
  }
  return result
}
