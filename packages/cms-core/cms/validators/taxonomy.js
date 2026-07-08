import { CmsValidationError } from '../http/errors.js'
import { assertMediaId } from './media.js'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function normalizeRequiredText(value, fieldName, maxLength = 140) {
  const text = typeof value === 'string' ? value.trim() : ''

  if (!text) {
    throw new CmsValidationError(`${fieldName} is required.`, {
      code: 'REQUIRED_FIELD',
      details: { field: fieldName },
    })
  }

  if (text.length > maxLength) {
    throw new CmsValidationError(`${fieldName} is too long.`, {
      code: 'TEXT_TOO_LONG',
      details: { field: fieldName, maxLength },
    })
  }

  return text
}

export function normalizeOptionalText(value, fieldName, maxLength = 1000) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()

  if (!text) return null
  if (text.length > maxLength) {
    throw new CmsValidationError(`${fieldName} is too long.`, {
      code: 'TEXT_TOO_LONG',
      details: { field: fieldName, maxLength },
    })
  }

  return text
}

export function normalizeSlug(value, fallbackValue) {
  const slug = value ? slugify(value) : slugify(fallbackValue)

  if (!slug || !SLUG_PATTERN.test(slug)) {
    throw new CmsValidationError('Valid slug is required.', {
      code: 'INVALID_SLUG',
    })
  }

  return slug
}

export function normalizeOptionalMediaId(value) {
  if (!value) return null
  return assertMediaId(value)
}
