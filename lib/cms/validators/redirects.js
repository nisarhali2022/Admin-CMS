import { CmsValidationError } from '../http/errors.js'
import { assertMediaId } from './media.js'

const REDIRECT_TYPES = new Set([301, 302])

export function assertRedirectId(value) {
  return assertMediaId(value)
}

function normalizePath(value, fieldName) {
  const text = typeof value === 'string' ? value.trim() : ''

  if (!text.startsWith('/') || text.startsWith('//')) {
    throw new CmsValidationError(`${fieldName} must be a relative path starting with /.`, {
      code: 'INVALID_REDIRECT_PATH',
      details: { field: fieldName },
    })
  }

  return text
}

function normalizeToUrl(value) {
  const text = typeof value === 'string' ? value.trim() : ''

  if (
    text.startsWith('/') ||
    text.startsWith('http://') ||
    text.startsWith('https://')
  ) {
    return text
  }

  throw new CmsValidationError('Redirect destination must be a relative path or URL.', {
    code: 'INVALID_REDIRECT_DESTINATION',
  })
}

function normalizeRedirectType(value) {
  const redirectType = Number(value || 301)

  if (!REDIRECT_TYPES.has(redirectType)) {
    throw new CmsValidationError('Redirect type must be 301 or 302.', {
      code: 'INVALID_REDIRECT_TYPE',
    })
  }

  return redirectType
}

function assertNoLoop(fromPath, toUrl) {
  if (fromPath === toUrl) {
    throw new CmsValidationError('Redirect source and destination cannot match.', {
      code: 'REDIRECT_LOOP',
    })
  }
}

export function validateRedirectPayload(payload) {
  const fromPath = normalizePath(payload?.fromPath, 'fromPath')
  const toUrl = normalizeToUrl(payload?.toUrl)

  assertNoLoop(fromPath, toUrl)

  return {
    fromPath,
    toUrl,
    redirectType: normalizeRedirectType(payload?.redirectType),
    isActive:
      typeof payload?.isActive === 'boolean' ? payload.isActive : true,
  }
}

export function validateRedirectPatchPayload(payload) {
  const result = {}

  if (Object.hasOwn(payload || {}, 'fromPath')) {
    result.fromPath = normalizePath(payload.fromPath, 'fromPath')
  }
  if (Object.hasOwn(payload || {}, 'toUrl')) result.toUrl = normalizeToUrl(payload.toUrl)
  if (Object.hasOwn(payload || {}, 'redirectType')) {
    result.redirectType = normalizeRedirectType(payload.redirectType)
  }
  if (Object.hasOwn(payload || {}, 'isActive')) {
    if (typeof payload.isActive !== 'boolean') {
      throw new CmsValidationError('Redirect active status must be true or false.', {
        code: 'INVALID_REDIRECT_ACTIVE_STATUS',
      })
    }
    result.isActive = payload.isActive
  }

  if (result.fromPath && result.toUrl) assertNoLoop(result.fromPath, result.toUrl)

  if (Object.keys(result).length === 0) {
    throw new CmsValidationError('At least one redirect field is required.', {
      code: 'EMPTY_REDIRECT_UPDATE',
    })
  }

  return result
}
