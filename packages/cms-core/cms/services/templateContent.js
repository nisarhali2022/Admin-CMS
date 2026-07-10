import { CmsValidationError } from '../http/errors.js'
import { getAuthor } from '../repositories/authors.js'
import { getMedia } from '../repositories/media.js'
import { listPages } from '../repositories/pages.js'
import {
  createTemplateContent,
  getTemplateContent,
  hardDeleteTemplateContent,
  listTemplateContent,
  updateTemplateContent,
} from '../repositories/templateContent.js'
import {
  collectMediaIds,
  validateTemplateContentPayload,
} from '../validators/templateContent.js'
import { triggerRevalidation } from './revalidation.js'

async function assertMediaReferencesBelongToWebsite(websiteId, payload) {
  const mediaIds = new Set()

  if (payload.ogImageId) mediaIds.add(payload.ogImageId)
  for (const mediaId of collectMediaIds(payload.contentData || {})) {
    mediaIds.add(mediaId)
  }

  for (const mediaId of mediaIds) {
    const media = await getMedia(websiteId, mediaId)

    if (!media) {
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

  if (!author || !author.isActive) {
    throw new CmsValidationError(
      'Template author must belong to the selected website and be active.',
      {
        code: 'INVALID_TEMPLATE_AUTHOR',
        details: { authorId },
      }
    )
  }
}

function normalizeTitle(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

async function assertUniquePageTitle(websiteId, title, currentTemplateContentId = null) {
  const [pages, templates] = await Promise.all([
    listPages(websiteId),
    listTemplateContent(websiteId),
  ])
  const nextTitle = normalizeTitle(title)

  for (const page of pages) {
    if (normalizeTitle(page.title) === nextTitle) {
      throw new CmsValidationError('A page with this title already exists.', {
        code: 'DUPLICATE_PAGE_TITLE',
      })
    }
  }

  for (const template of templates) {
    if (currentTemplateContentId && template.id === currentTemplateContentId) continue
    if (normalizeTitle(template.title) === nextTitle) {
      throw new CmsValidationError('A page with this title already exists.', {
        code: 'DUPLICATE_PAGE_TITLE',
      })
    }
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

function buildFinalTemplatePayload(existing, payload) {
  return validateTemplateContentPayload({
    templateKey: Object.hasOwn(payload, 'templateKey')
      ? payload.templateKey
      : existing.templateKey,
    path: Object.hasOwn(payload, 'path') ? payload.path : existing.path,
    title: Object.hasOwn(payload, 'title') ? payload.title : existing.title,
    contentData: Object.hasOwn(payload, 'contentData')
      ? payload.contentData
      : existing.contentData,
    focusKeyphrase: Object.hasOwn(payload, 'focusKeyphrase')
      ? payload.focusKeyphrase
      : existing.focusKeyphrase,
    seoTitle: Object.hasOwn(payload, 'seoTitle')
      ? payload.seoTitle
      : existing.seoTitle,
    metaDescription: Object.hasOwn(payload, 'metaDescription')
      ? payload.metaDescription
      : existing.metaDescription,
    authorId: Object.hasOwn(payload, 'authorId') ? payload.authorId : existing.authorId,
    canonicalUrl: Object.hasOwn(payload, 'canonicalUrl')
      ? payload.canonicalUrl
      : existing.canonicalUrl,
    robotsMeta: Object.hasOwn(payload, 'robotsMeta')
      ? payload.robotsMeta
      : existing.robotsMeta,
    ogImageId: Object.hasOwn(payload, 'ogImageId')
      ? payload.ogImageId
      : existing.ogImageId,
    sitemapInclude: Object.hasOwn(payload, 'sitemapInclude')
      ? payload.sitemapInclude
      : existing.sitemapInclude,
  })
}

async function withRevalidation(result, event) {
  const revalidation = await triggerRevalidation(event)
  return { result, revalidation }
}

export async function createTemplateContentForWebsite(websiteId, payload) {
  await assertMediaReferencesBelongToWebsite(websiteId, payload)
  await assertAuthorBelongsToWebsite(websiteId, payload.authorId)
  await assertUniquePageTitle(websiteId, payload.title)

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
  const existing = await getTemplateContent(websiteId, templateContentId)
  if (!existing) {
    return { result: null, revalidation: null }
  }
  const finalPayload = buildFinalTemplatePayload(existing, payload)

  await assertMediaReferencesBelongToWebsite(websiteId, finalPayload)
  await assertAuthorBelongsToWebsite(websiteId, finalPayload.authorId)
  if (finalPayload.title) {
    await assertUniquePageTitle(websiteId, finalPayload.title, templateContentId)
  }

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
