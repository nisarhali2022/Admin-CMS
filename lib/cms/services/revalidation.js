import { decryptSecret } from '../crypto/secrets.js'
import { getRawSettings } from '../repositories/settings.js'

export async function triggerRevalidation(event = {}) {
  if (!event.websiteId) {
    return {
      attempted: false,
      skipped: true,
      reason: 'Website ID is required for revalidation.',
    }
  }

  let settings = null

  try {
    settings = await getRawSettings(event.websiteId)
  } catch (error) {
    return {
      attempted: false,
      skipped: true,
      ok: false,
      reason: error?.message || 'Unable to load revalidation settings.',
      event: event.event,
    }
  }

  const url = settings?.revalidation_url

  if (!url) {
    return {
      attempted: false,
      skipped: true,
      reason: 'No revalidation webhook is configured for this website.',
    }
  }

  const secret = decryptSecret(settings.revalidation_secret_encrypted)
  const payload = {
    websiteId: event.websiteId,
    event: event.event,
    paths: Array.isArray(event.paths) ? event.paths : [],
    resourceType: event.resourceType,
    resourceId: event.resourceId,
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-cms-revalidation-secret': secret } : {}),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })

    return {
      attempted: true,
      skipped: false,
      ok: response.ok,
      status: response.status,
      event: event.event,
    }
  } catch (error) {
    return {
      attempted: true,
      skipped: false,
      ok: false,
      status: null,
      error: error?.message || 'Revalidation webhook failed.',
      event: event.event,
    }
  }
}
