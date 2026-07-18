import { CmsValidationError } from '../http/errors.js'
import { getAuthor } from '../repositories/authors.js'
import { getMedia } from '../repositories/media.js'
import { listCategories } from '../repositories/categories.js'
import { listTemplateContent } from '../repositories/templateContent.js'
import { createPage, hardDeletePage, listPages, updatePage } from '../repositories/pages.js'
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

function normalizeTitle(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

const RESERVED_PUBLIC_ROUTE_SEGMENTS = new Set([
  'api',
  'admin',
  'author',
  'blog',
  'search',
  'tag',
])

function normalizePublicPath(value) {
  const path = String(value || '').replace(/\/$/, '') || '/'
  return path.startsWith('/') ? path : `/${path}`
}

function assertAllowedPublicPath(path) {
  const firstSegment = normalizePublicPath(path).split('/').filter(Boolean)[0]
  if (RESERVED_PUBLIC_ROUTE_SEGMENTS.has(firstSegment)) {
    throw new CmsValidationError('This path is reserved by the public frontend.', {
      code: 'RESERVED_PUBLIC_ROUTE',
      details: { path },
    })
  }
}

async function assertPublicPathAvailable(websiteId, path, currentPageId = null) {
  assertAllowedPublicPath(path)
  const [pages, templates, categories] = await Promise.all([
    listPages(websiteId),
    listTemplateContent(websiteId),
    listCategories(websiteId),
  ])
  const normalizedPath = normalizePublicPath(path)

  if (pages.some((page) => page.id !== currentPageId && normalizePublicPath(page.path) === normalizedPath)) {
    throw new CmsValidationError('A CMS page already uses this public path.', {
      code: 'DUPLICATE_PUBLIC_ROUTE',
      details: { path: normalizedPath },
    })
  }
  if (templates.some((template) => normalizePublicPath(template.path) === normalizedPath)) {
    throw new CmsValidationError('A fixed template already uses this public path.', {
      code: 'DUPLICATE_PUBLIC_ROUTE',
      details: { path: normalizedPath },
    })
  }
  if (categories.some((category) => `/${category.slug}` === normalizedPath)) {
    throw new CmsValidationError('A category already uses this public path.', {
      code: 'DUPLICATE_PUBLIC_ROUTE',
      details: { path: normalizedPath },
    })
  }
}

async function assertUniquePageTitle(websiteId, title, currentPageId = null) {
  const [pages, templates] = await Promise.all([
    listPages(websiteId),
    listTemplateContent(websiteId),
  ])
  const nextTitle = normalizeTitle(title)

  for (const page of pages) {
    if (currentPageId && page.id === currentPageId) continue
    if (normalizeTitle(page.title) === nextTitle) {
      throw new CmsValidationError('A page with this title already exists.', {
        code: 'DUPLICATE_PAGE_TITLE',
      })
    }
  }

  for (const template of templates) {
    if (normalizeTitle(template.title) === nextTitle) {
      throw new CmsValidationError('A page with this title already exists.', {
        code: 'DUPLICATE_PAGE_TITLE',
      })
    }
  }
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
  await assertUniquePageTitle(websiteId, payload.title)
  await assertPublicPathAvailable(websiteId, payload.path)

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
  await assertUniquePageTitle(websiteId, payload.title, pageId)
  await assertPublicPathAvailable(websiteId, payload.path, pageId)

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
