import { CmsValidationError } from '../http/errors.js'

const DOMAIN_PATTERN =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeDomain(value) {
  if (typeof value !== 'string') return ''

  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
}

export function assertWebsiteId(value) {
  if (!UUID_PATTERN.test(String(value || ''))) {
    throw new CmsValidationError('Valid website ID is required.', {
      code: 'INVALID_WEBSITE_ID',
    })
  }

  return value
}

function assertWebsiteName(value) {
  const name = typeof value === 'string' ? value.trim() : ''

  if (!name) {
    throw new CmsValidationError('Website name is required.', {
      code: 'WEBSITE_NAME_REQUIRED',
    })
  }

  if (name.length > 120) {
    throw new CmsValidationError('Website name must be 120 characters or fewer.', {
      code: 'WEBSITE_NAME_TOO_LONG',
    })
  }

  return name
}

function assertPrimaryDomain(value) {
  const primaryDomain = normalizeDomain(value)

  if (!DOMAIN_PATTERN.test(primaryDomain)) {
    throw new CmsValidationError('Valid primary domain is required.', {
      code: 'INVALID_PRIMARY_DOMAIN',
    })
  }

  return primaryDomain
}

export function validateCreateWebsitePayload(payload) {
  return {
    name: assertWebsiteName(payload?.name),
    primaryDomain: assertPrimaryDomain(payload?.primaryDomain),
  }
}

export function validateUpdateWebsitePayload(payload) {
  const result = {}

  if (Object.hasOwn(payload || {}, 'name')) {
    result.name = assertWebsiteName(payload.name)
  }

  if (Object.hasOwn(payload || {}, 'primaryDomain')) {
    result.primaryDomain = assertPrimaryDomain(payload.primaryDomain)
  }

  if (Object.hasOwn(payload || {}, 'isActive')) {
    if (typeof payload.isActive !== 'boolean') {
      throw new CmsValidationError('Website active status must be true or false.', {
        code: 'INVALID_WEBSITE_STATUS',
      })
    }

    result.isActive = payload.isActive
  }

  if (Object.keys(result).length === 0) {
    throw new CmsValidationError('At least one website field is required.', {
      code: 'EMPTY_WEBSITE_UPDATE',
    })
  }

  return result
}
