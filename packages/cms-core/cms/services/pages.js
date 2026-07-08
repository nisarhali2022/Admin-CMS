import { CmsValidationError } from '../http/errors.js'
import { getAuthor } from '../repositories/authors.js'
import { getMedia } from '../repositories/media.js'
import { createPage, hardDeletePage, updatePage } from '../repositories/pages.js'
import { triggerRevalidation } from './revalidation.js'

async function assertAuthorBelongsToWebsite(websiteId, authorId) {
  if (!authorId) return

  const author = await getAuthor(websiteId, authorId)

  if (!author || !author.isActive) {
    throw new CmsValidationError(
      'Page author must belong to the selected website and be active.',
      {
        code: 'INVALID_PAGE_AUTHOR',
      }
    )
  }
}

async function assertMediaBelongsToWebsite(websiteId, mediaId) {
  if (!mediaId) return

  const media = await getMedia(websiteId, mediaId)

  if (!media) {
    throw new CmsValidationError('Page feature image must belong to the selected website.', {
      code: 'INVALID_PAGE_MEDIA_REFERENCE',
      details: { mediaId },
    })
  }
}

async function assertPageReferences(websiteId, payload) {
  await assertAuthorBelongsToWebsite(websiteId, payload.authorId)
  await assertMediaBelongsToWebsite(websiteId, payload.featuredImageId)
}

function normalizeDuplicateError(error) {
  if (error?.code === '23505') {
    throw new CmsValidationError('Page path already exists for this website.', {
      code: 'DUPLICATE_PAGE_PATH',
    })
  }

  throw error
}

async function withRevalidation(result, event) {
  const revalidation = await triggerRevalidation(event)
  return { result, revalidation }
}

export async function createPageForWebsite(websiteId, payload) {
  await assertPageReferences(websiteId, payload)

  try {
    const result = await createPage(websiteId, payload)
    return withRevalidation(result, {
      websiteId,
      event: 'page.saved',
      resourceType: 'page',
      resourceId: result?.id,
      paths: [result?.path].filter(Boolean),
    })
  } catch (error) {
    normalizeDuplicateError(error)
  }
}

export async function updatePageForWebsite(websiteId, pageId, payload) {
  await assertPageReferences(websiteId, payload)

  try {
    const result = await updatePage(websiteId, pageId, payload)
    return withRevalidation(result, {
      websiteId,
      event: 'page.updated',
      resourceType: 'page',
      resourceId: result?.id,
      paths: [result?.path].filter(Boolean),
    })
  } catch (error) {
    normalizeDuplicateError(error)
  }
}

export async function permanentlyDeletePage({ websiteId, pageId }) {
  await hardDeletePage(websiteId, pageId)
  const revalidation = await triggerRevalidation({
    websiteId,
    event: 'page.deleted',
    resourceType: 'page',
    resourceId: pageId,
  })

  return { deleted: true, pageId, revalidation }
}
