import { CmsValidationError } from '../http/errors.js'
import {
  createRedirect,
  hardDeleteRedirect,
  updateRedirect,
} from '../repositories/redirects.js'
import { triggerRevalidation } from './revalidation.js'

function normalizeDuplicateError(error) {
  if (error?.code === '23505') {
    throw new CmsValidationError(
      'Redirect source path already exists for this website.',
      {
        code: 'DUPLICATE_REDIRECT_PATH',
      }
    )
  }

  throw error
}

async function withRevalidation(result, event) {
  const revalidation = await triggerRevalidation(event)
  return { result, revalidation }
}

export async function createRedirectForWebsite(websiteId, payload) {
  try {
    const result = await createRedirect(websiteId, payload)
    return withRevalidation(result, {
      websiteId,
      event: 'redirect.saved',
      resourceType: 'redirect',
      resourceId: result?.id,
      paths: [payload.fromPath],
    })
  } catch (error) {
    normalizeDuplicateError(error)
  }
}

export async function updateRedirectForWebsite(websiteId, redirectId, payload) {
  try {
    const result = await updateRedirect(websiteId, redirectId, payload)
    return withRevalidation(result, {
      websiteId,
      event: 'redirect.updated',
      resourceType: 'redirect',
      resourceId: result?.id,
      paths: result?.fromPath ? [result.fromPath] : [],
    })
  } catch (error) {
    normalizeDuplicateError(error)
  }
}

export async function permanentlyDeleteRedirect({ websiteId, redirectId }) {
  await hardDeleteRedirect(websiteId, redirectId)
  const revalidation = await triggerRevalidation({
    websiteId,
    event: 'redirect.deleted',
    resourceType: 'redirect',
    resourceId: redirectId,
  })

  return { deleted: true, redirectId, revalidation }
}
