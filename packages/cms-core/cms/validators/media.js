import { CmsValidationError } from '../http/errors.js'
import { assertWebsiteId } from './websites.js'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function assertMediaId(value) {
  if (!UUID_PATTERN.test(String(value || ''))) {
    throw new CmsValidationError('Valid media ID is required.', {
      code: 'INVALID_MEDIA_ID',
    })
  }

  return value
}

export function getRequiredWebsiteId(searchParams) {
  const websiteId = searchParams.get('websiteId')
  return assertWebsiteId(websiteId)
}

function normalizeOptionalText(value, maxLength, fieldName) {
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

export function validateMediaUploadFields(formData) {
  return {
    altText: normalizeOptionalText(formData.get('altText'), 300, 'altText'),
    caption: normalizeOptionalText(formData.get('caption'), 500, 'caption'),
  }
}

export function validateMediaPatchPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new CmsValidationError('Media payload is required.', {
      code: 'MEDIA_PAYLOAD_REQUIRED',
    })
  }

  return {
    altText: Object.hasOwn(payload, 'altText')
      ? normalizeOptionalText(payload.altText, 300, 'altText')
      : undefined,
    caption: Object.hasOwn(payload, 'caption')
      ? normalizeOptionalText(payload.caption, 500, 'caption')
      : undefined,
  }
}
