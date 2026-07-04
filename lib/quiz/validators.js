import { CmsValidationError } from '../cms/http/errors.js'

function normalizeText(value, fieldName, maxLength) {
  const text = typeof value === 'string' ? value.trim() : ''

  if (!text) {
    throw new CmsValidationError(`${fieldName} is required.`, {
      code: 'QUIZ_FIELD_REQUIRED',
      details: { field: fieldName },
    })
  }

  if (text.length > maxLength) {
    throw new CmsValidationError(`${fieldName} is too long.`, {
      code: 'QUIZ_FIELD_TOO_LONG',
      details: { field: fieldName, maxLength },
    })
  }

  return text
}

function normalizeSlug(value, title) {
  const source = typeof value === 'string' && value.trim() ? value : title
  const slug = source
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!slug) {
    throw new CmsValidationError('Quiz slug is required.', {
      code: 'QUIZ_SLUG_REQUIRED',
    })
  }

  return slug
}

export function validateQuizPayload(payload) {
  const title = normalizeText(payload?.title, 'title', 180)

  return {
    title,
    slug: normalizeSlug(payload?.slug, title),
    description: normalizeText(payload?.description, 'description', 500),
    isPublished:
      typeof payload?.isPublished === 'boolean' ? payload.isPublished : true,
  }
}
