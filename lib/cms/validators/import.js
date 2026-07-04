import { CmsValidationError } from '../http/errors.js'
import { assertMediaId } from './media.js'

export function assertImportJobId(value) {
  return assertMediaId(value)
}

function normalizeUrl(value, fieldName) {
  const text = typeof value === 'string' ? value.trim().replace(/\/+$/, '') : ''

  if (!text.startsWith('http://') && !text.startsWith('https://')) {
    throw new CmsValidationError(`${fieldName} must be an absolute URL.`, {
      code: 'INVALID_IMPORT_URL',
      details: { field: fieldName },
    })
  }

  return text
}

function normalizeOptionalText(value, fieldName, maxLength = 500) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()

  if (!text) return null
  if (text.length > maxLength) {
    throw new CmsValidationError(`${fieldName} is too long.`, {
      code: 'IMPORT_TEXT_TOO_LONG',
      details: { field: fieldName, maxLength },
    })
  }

  return text
}

export function validateWordPressImportPayload(payload) {
  const wordpressUsername = normalizeOptionalText(
    payload?.wordpressUsername,
    'wordpressUsername',
    200
  )
  const wordpressApplicationPassword = normalizeOptionalText(
    payload?.wordpressApplicationPassword,
    'wordpressApplicationPassword',
    300
  )

  if (wordpressUsername && !wordpressApplicationPassword) {
    throw new CmsValidationError('WordPress application password is required.', {
      code: 'WORDPRESS_PASSWORD_REQUIRED',
    })
  }

  if (!wordpressUsername && wordpressApplicationPassword) {
    throw new CmsValidationError('WordPress username is required.', {
      code: 'WORDPRESS_USERNAME_REQUIRED',
    })
  }

  return {
    wordpressBaseUrl: normalizeUrl(payload?.wordpressBaseUrl, 'wordpressBaseUrl'),
    wordpressUsername,
    wordpressApplicationPassword,
    confirmInactiveImport: Boolean(payload?.confirmInactiveImport),
  }
}

export function validateImportResetPayload(payload = {}) {
  return {
    confirmReset: Boolean(payload.confirmReset),
  }
}
