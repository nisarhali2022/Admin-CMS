import { CmsValidationError } from '../http/errors.js'
import { getAuthor } from '../repositories/authors.js'
import { getMedia } from '../repositories/media.js'
import {
  createTemplateContent,
  hardDeleteTemplateContent,
  setTemplateStatus,
  restoreTemplateContent,
  trashTemplateContent,
  updateTemplateContent,
} from '../repositories/templateContent.js'
import { collectMediaIds } from '../validators/templateContent.js'
import { triggerRevalidation } from './revalidation.js'

async function assertMediaReferencesBelongToWebsite(websiteId, payload) {
  const mediaIds = new Set()

  if (payload.ogImageId) mediaIds.add(payload.ogImageId)
  for (const mediaId of collectMediaIds(payload.contentData || {})) {
    mediaIds.add(mediaId)
  }

  for (const mediaId of mediaIds) {
    const media = await getMedia(websiteId, mediaId)

    if (!media || media.deletedAt) {
      throw new CmsValidationError(
        'Template media references must belong to the selected website.',
        {
          code: 'INVALID_TEMPLATE_MEDIA_REFERENCE',
          details: { mediaId },
        }
      )
    }
  }
}

async function assertAuthorBelongsToWebsite(websiteId, authorId) {
  if (!authorId) return

  const author = await getAuthor(websiteId, authorId)

  if (!author || author.deletedAt || !author.isActive) {
    throw new CmsValidationError(
      'Template author must belong to the selected website and be active.',
      {
        code: 'INVALID_TEMPLATE_AUTHOR',
        details: { authorId },
      }
    )
  }
}

function normalizeDuplicateError(error) {
  if (error?.code === '23505') {
    throw new CmsValidationError(
      'Template key or path already exists for this website.',
      {
        code: 'DUPLICATE_TEMPLATE_CONTENT',
      }
    )
  }

  throw error
}

async function withRevalidation(result, event) {
  const revalidation = await triggerRevalidation(event)
  return { result, revalidation }
}

export async function createTemplateContentForWebsite(websiteId, payload) {
  await assertMediaReferencesBelongToWebsite(websiteId, payload)
  await assertAuthorBelongsToWebsite(websiteId, payload.authorId)

  try {
    const result = await createTemplateContent(websiteId, payload)
    return withRevalidation(result, {
      websiteId,
      event: 'template.saved',
      resourceType: 'templateContent',
      resourceId: result?.id,
    })
  } catch (error) {
    normalizeDuplicateError(error)
  }
}

export async function updateTemplateContentForWebsite(
  websiteId,
  templateContentId,
  payload
) {
  await assertMediaReferencesBelongToWebsite(websiteId, payload)
  await assertAuthorBelongsToWebsite(websiteId, payload.authorId)

  try {
    const result = await updateTemplateContent(websiteId, templateContentId, payload)
    return withRevalidation(result, {
      websiteId,
      event: 'template.updated',
      resourceType: 'templateContent',
      resourceId: result?.id,
    })
  } catch (error) {
    normalizeDuplicateError(error)
  }
}

export async function publishTemplateContentForWebsite(websiteId, templateContentId) {
  const result = await setTemplateStatus(websiteId, templateContentId, 'published')
  return withRevalidation(result, {
    websiteId,
    event: 'template.published',
    resourceType: 'templateContent',
    resourceId: result?.id,
  })
}

export async function unpublishTemplateContentForWebsite(
  websiteId,
  templateContentId
) {
  const result = await setTemplateStatus(websiteId, templateContentId, 'unpublished')
  return withRevalidation(result, {
    websiteId,
    event: 'template.unpublished',
    resourceType: 'templateContent',
    resourceId: result?.id,
  })
}

export async function trashTemplateContentForWebsite(websiteId, templateContentId) {
  const result = await trashTemplateContent(websiteId, templateContentId)
  return withRevalidation(result, {
    websiteId,
    event: 'template.trashed',
    resourceType: 'templateContent',
    resourceId: result?.id,
  })
}

export async function restoreTemplateContentForWebsite(websiteId, templateContentId) {
  const result = await restoreTemplateContent(websiteId, templateContentId)
  return withRevalidation(result, {
    websiteId,
    event: 'template.restored',
    resourceType: 'templateContent',
    resourceId: result?.id,
  })
}

export async function permanentlyDeleteTemplateContent({
  websiteId,
  templateContentId,
}) {
  await hardDeleteTemplateContent(websiteId, templateContentId)
  const revalidation = await triggerRevalidation({
    websiteId,
    event: 'template.deleted',
    resourceType: 'templateContent',
    resourceId: templateContentId,
  })

  return { deleted: true, templateContentId, revalidation }
}
