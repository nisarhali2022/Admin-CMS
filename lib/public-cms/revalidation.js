import crypto from 'node:crypto'

function timingSafeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left || ''))
  const rightBuffer = Buffer.from(String(right || ''))

  if (leftBuffer.length !== rightBuffer.length) return false
  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

export function verifyRevalidationSecret(request, expectedSecret) {
  if (!expectedSecret) return false

  const provided =
    request?.headers?.get?.('x-cms-revalidation-secret') ||
    request?.headers?.['x-cms-revalidation-secret']

  return timingSafeEqualText(provided, expectedSecret)
}

export function normalizeRevalidationPayload(payload = {}) {
  return {
    websiteId: payload.websiteId || null,
    event: payload.event || null,
    paths: Array.isArray(payload.paths) ? payload.paths.filter(Boolean) : [],
    resourceType: payload.resourceType || null,
    resourceId: payload.resourceId || null,
  }
}
