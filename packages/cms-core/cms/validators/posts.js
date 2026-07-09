import { CmsValidationError } from '../http/errors.js'
import { POST_BLOCK_TYPES, getDefaultPostBlocks } from '../schemas/postBlocks.js'
import { assertMediaId } from './media.js'
import {
  normalizeOptionalMediaId,
  normalizeOptionalText,
  normalizeRequiredText,
  normalizeSlug,
} from './taxonomy.js'

const ROBOTS_META_VALUES = new Set([
  'index,follow',
  'noindex,follow',
  'index,nofollow',
  'noindex,nofollow',
])

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function assertPostId(value) {
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

function assertNoScheduling(payload) {
  if (
    Object.hasOwn(payload || {}, 'scheduledFor') ||
    Object.hasOwn(payload || {}, 'scheduled_for') ||
    Object.hasOwn(payload || {}, 'publishAt')
  ) {
    throw new CmsValidationError('Post scheduling is not supported in v1.', {
      code: 'POST_SCHEDULING_UNSUPPORTED',
    })
  }
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

function text(value, fieldName, maxLength = 5000) {
  return normalizeOptionalText(value, fieldName, maxLength) || ''
}

function validateBlock(block, index) {
  if (!block || typeof block !== 'object' || Array.isArray(block)) {
    throw new CmsValidationError('Post block must be an object.', {
      code: 'INVALID_POST_BLOCK',
      details: { index },
    })
  }

  if (!POST_BLOCK_TYPES.includes(block.type)) {
    throw new CmsValidationError('Unsupported post block type.', {
      code: 'UNSUPPORTED_POST_BLOCK',
      details: { index, supported: POST_BLOCK_TYPES },
    })
  }

  switch (block.type) {
    case 'paragraph':
      return { type: 'paragraph', text: text(block.text, `blocks.${index}.text`) }
    case 'heading':
      return {
        type: 'heading',
        level: [2, 3, 4].includes(Number(block.level)) ? Number(block.level) : 2,
        text: text(block.text, `blocks.${index}.text`, 300),
      }
    case 'image':
      return {
        type: 'image',
        mediaId: assertMediaId(block.mediaId),
        alt: normalizeOptionalText(block.alt, `blocks.${index}.alt`, 300),
        caption: normalizeOptionalText(block.caption, `blocks.${index}.caption`, 500),
      }
    case 'list':
      return {
        type: 'list',
        ordered: Boolean(block.ordered),
        items: Array.isArray(block.items)
          ? block.items.map((item, itemIndex) =>
              text(item, `blocks.${index}.items.${itemIndex}`, 500)
            )
          : [],
      }
    case 'quote':
      return {
        type: 'quote',
        text: text(block.text, `blocks.${index}.text`, 1000),
        cite: normalizeOptionalText(block.cite, `blocks.${index}.cite`, 200),
      }
    case 'link_button':
      return {
        type: 'link_button',
        label: text(block.label, `blocks.${index}.label`, 120),
        href: normalizeUrl(block.href, `blocks.${index}.href`) || '/',
      }
    case 'toc':
      return { type: 'toc' }
    case 'faq':
      return {
        type: 'faq',
        items: Array.isArray(block.items)
          ? block.items.map((item, itemIndex) => ({
              question: text(
                item?.question,
                `blocks.${index}.items.${itemIndex}.question`,
                300
              ),
              answer: text(
                item?.answer,
                `blocks.${index}.items.${itemIndex}.answer`,
                2000
              ),
            }))
          : [],
      }
    case 'table':
      return {
        type: 'table',
        headers: Array.isArray(block.headers)
          ? block.headers.map((header, headerIndex) =>
              text(header, `blocks.${index}.headers.${headerIndex}`, 200)
            )
          : [],
        rows: Array.isArray(block.rows)
          ? block.rows.map((row) =>
              Array.isArray(row)
                ? row.map((cell, cellIndex) =>
                    text(cell, `blocks.${index}.rows.cell.${cellIndex}`, 500)
                  )
                : []
            )
          : [],
      }
    case 'callout':
      return {
        type: 'callout',
        tone: ['info', 'success', 'warning'].includes(block.tone)
          ? block.tone
          : 'info',
        text: text(block.text, `blocks.${index}.text`, 1000),
      }
    default:
      return block
  }
}

export function validateBodyBlocks(bodyBlocks) {
  const blocks = Array.isArray(bodyBlocks) ? bodyBlocks : getDefaultPostBlocks()
  return blocks.map((block, index) => validateBlock(block, index))
}

function collectPostHtmlMediaIds(bodyHtml, result) {
  const html = typeof bodyHtml === 'string' ? bodyHtml : ''
  const mediaIdPattern = /data-media-id=["']([^"']+)["']/g

  for (const match of html.matchAll(mediaIdPattern)) {
    result.add(assertMediaId(match[1]))
  }
}

export function collectPostMediaIds(payload, result = new Set()) {
  if (payload?.featuredImageId) result.add(assertMediaId(payload.featuredImageId))
  if (payload?.ogImageId) result.add(assertMediaId(payload.ogImageId))
  collectPostHtmlMediaIds(payload?.bodyHtml, result)

  for (const block of payload?.bodyBlocks || []) {
    if (block?.type === 'image' && block.mediaId) {
      result.add(assertMediaId(block.mediaId))
    }
  }

  return result
}

function normalizePostFields(payload) {
  assertNoScheduling(payload)
  const title = normalizeRequiredText(payload?.title, 'title', 180)

  return {
    title,
    slug: normalizeSlug(payload?.slug, title),
    excerpt: normalizeOptionalText(payload?.excerpt, 'excerpt', 500),
    authorId: assertRequiredReferenceId(payload?.authorId, 'authorId', 'Author'),
    categoryId: assertRequiredReferenceId(payload?.categoryId, 'categoryId', 'Category'),
    featuredImageId: normalizeOptionalMediaId(payload?.featuredImageId),
    bodyHtml: normalizeOptionalText(payload?.bodyHtml, 'bodyHtml', 100000),
    bodyBlocks: validateBodyBlocks(payload?.bodyBlocks),
    seoTitle: normalizeOptionalText(payload?.seoTitle, 'seoTitle', 180),
    metaDescription: normalizeOptionalText(
      payload?.metaDescription,
      'metaDescription',
      300
    ),
    canonicalUrl: normalizeUrl(payload?.canonicalUrl, 'canonicalUrl'),
    robotsMeta: normalizeRobotsMeta(payload?.robotsMeta),
    ogImageId: normalizeOptionalMediaId(payload?.ogImageId),
    sitemapInclude:
      typeof payload?.sitemapInclude === 'boolean' ? payload.sitemapInclude : true,
  }
}

export function validatePostPayload(payload) {
  return normalizePostFields(payload)
}

export function validatePostPatchPayload(payload) {
  return normalizePostFields(payload)
}
