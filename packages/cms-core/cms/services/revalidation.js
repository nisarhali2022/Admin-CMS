import { decryptSecret } from '../crypto/secrets.js'
import { getRawSettings } from '../repositories/settings.js'
import { listWebsites } from '../repositories/websites.js'

function getWebhookFailureReason(status) {
  if (status === 401 || status === 403) {
    return `Webhook rejected the configured secret (HTTP ${status}).`
  }
  if (status === 404) {
    return 'Webhook URL was not found (HTTP 404).'
  }
  if (status === 405) {
    return 'Webhook does not accept POST requests (HTTP 405).'
  }
  return `Webhook returned HTTP ${status}.`
}

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
      ...(response.ok ? {} : { reason: getWebhookFailureReason(response.status) }),
      event: event.event,
    }
  } catch (error) {
    return {
      attempted: true,
      skipped: false,
      ok: false,
      status: null,
      error: error?.message || 'Revalidation webhook failed.',
      reason: 'Could not reach the revalidation webhook.',
      event: event.event,
    }
  }
}

/**
 * A global resource, such as the daily quiz, is shared by every public
 * website. Notify each active website independently so a failed webhook does
 * not prevent another site's cache from being refreshed.
 */
export async function triggerRevalidationForActiveWebsites(event = {}) {
  let websites = []

  try {
    websites = await listWebsites()
  } catch (error) {
    return {
      attempted: false,
      skipped: true,
      ok: false,
      reason: error?.message || 'Unable to load websites for revalidation.',
      event: event.event,
      results: [],
    }
  }

  const activeWebsites = websites.filter((website) => website?.isActive && website?.id)

  if (activeWebsites.length === 0) {
    return {
      attempted: false,
      skipped: true,
      ok: true,
      reason: 'No active websites require revalidation.',
      event: event.event,
      results: [],
    }
  }

  const results = await Promise.all(
    activeWebsites.map((website) =>
      triggerRevalidation({
        ...event,
        websiteId: website.id,
      })
    )
  )

  return {
    attempted: results.some((result) => result.attempted),
    skipped: results.every((result) => result.skipped),
    ok: results.every((result) => result.skipped || result.ok),
    event: event.event,
    results: activeWebsites.map((website, index) => ({
      websiteId: website.id,
      websiteDomain: website.primaryDomain,
      ...results[index],
    })),
  }
}
