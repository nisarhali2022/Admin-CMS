import { CmsValidationError } from '../http/errors.js'

function normalizeOptionalText(value, fieldName, maxLength = 10000) {
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

function normalizeJsonObject(value, fieldName) {
  if (value === null || value === undefined) return {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CmsValidationError(`${fieldName} must be an object.`, {
      code: 'INVALID_SETTINGS_OBJECT',
      details: { field: fieldName },
    })
  }

  return value
}

function normalizeUrl(value, fieldName) {
  const text = normalizeOptionalText(value, fieldName, 500)
  if (!text) return null

  if (text.startsWith('http://') || text.startsWith('https://')) return text

  throw new CmsValidationError(`${fieldName} must be an absolute URL.`, {
    code: 'INVALID_SETTINGS_URL',
    details: { field: fieldName },
  })
}

export function validateAdsenseSettings(value) {
  const input = normalizeJsonObject(value, 'adsenseSettings')
  const publisherId = normalizeOptionalText(input.publisherId, 'publisherId', 80)
  const enabled = Boolean(input.enabled)

  if (enabled && !publisherId?.startsWith('ca-pub-')) {
    throw new CmsValidationError(
      'Enabling AdSense requires a valid ca-pub- publisher ID.',
      {
        code: 'INVALID_ADSENSE_PUBLISHER_ID',
      }
    )
  }

  return {
    enabled,
    publisherId,
    autoAdsEnabled:
      typeof input.autoAdsEnabled === 'boolean' ? input.autoAdsEnabled : true,
    adsTxt: normalizeOptionalText(input.adsTxt, 'adsTxt', 5000),
  }
}

export function validateSettingsPatchPayload(payload) {
  const result = {}

  if (Object.hasOwn(payload || {}, 'robotsTxt')) {
    result.robotsTxt = normalizeOptionalText(payload.robotsTxt, 'robotsTxt', 10000)
  }
  if (Object.hasOwn(payload || {}, 'sitemapSettings')) {
    result.sitemapSettings = normalizeJsonObject(
      payload.sitemapSettings,
      'sitemapSettings'
    )
  }
  if (Object.hasOwn(payload || {}, 'seoDefaults')) {
    result.seoDefaults = normalizeJsonObject(payload.seoDefaults, 'seoDefaults')
  }
  if (Object.hasOwn(payload || {}, 'siteConfig')) {
    result.siteConfig = normalizeJsonObject(payload.siteConfig, 'siteConfig')
  }
  if (Object.hasOwn(payload || {}, 'adsenseSettings')) {
    result.adsenseSettings = validateAdsenseSettings(payload.adsenseSettings)
  }
  if (Object.hasOwn(payload || {}, 'revalidationUrl')) {
    result.revalidationUrl = normalizeUrl(payload.revalidationUrl, 'revalidationUrl')
  }
  if (Object.hasOwn(payload || {}, 'revalidationSecret')) {
    result.revalidationSecret = normalizeOptionalText(
      payload.revalidationSecret,
      'revalidationSecret',
      500
    )
  }
  if (Object.hasOwn(payload || {}, 'clearRevalidationSecret')) {
    result.clearRevalidationSecret = Boolean(payload.clearRevalidationSecret)
  }

  if (Object.keys(result).length === 0) {
    throw new CmsValidationError('At least one settings field is required.', {
      code: 'EMPTY_SETTINGS_UPDATE',
    })
  }

  return result
}
