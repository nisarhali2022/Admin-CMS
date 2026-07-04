import { CmsValidationError } from '../http/errors.js'
import {
  createImportJob,
  updateImportJob,
} from '../repositories/importJobs.js'
import { listAuthors } from '../repositories/authors.js'
import { listCategories } from '../repositories/categories.js'
import { listMedia } from '../repositories/media.js'
import { getWebsite } from '../repositories/websites.js'
import { TEMPLATE_CONTENT_SCHEMAS } from '../schemas/templateContent.js'
import { createAuthorForWebsite } from './authors.js'
import { createCategoryForWebsite } from './categories.js'
import { uploadImportedMedia } from './media.js'
import { createPostForWebsite } from './posts.js'
import { createTemplateContentForWebsite } from './templateContent.js'
import { validateAuthorPayload } from '../validators/authors.js'
import { validateCategoryPayload } from '../validators/categories.js'
import { validatePostPayload } from '../validators/posts.js'
import { validateTemplateContentPayload } from '../validators/templateContent.js'
import { deleteMediaObject } from '../../storage/supabaseStorage.js'
import { supabaseAdminRequest } from '../../supabase/adminRest.js'
import {
  fetchWordPressData,
  getEmbeddedFeaturedMedia,
  getMediaSourceUrl,
  normalizeWordPressItem,
} from './wordpress.js'

const FALLBACK_AUTHOR_NAME = 'Imported Author'
const TEMPLATE_BY_SLUG = new Map([
  ['home', 'home'],
  ['about', 'about'],
  ['about-us', 'about'],
  ['contact', 'contact'],
  ['privacy', 'privacy'],
  ['privacy-policy', 'privacy'],
  ['terms', 'terms'],
  ['terms-and-conditions', 'terms'],
  ['packages', 'packages'],
])

function normalizeSlug(value, fallback = 'item') {
  return String(value || fallback)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeHtml(value) {
  return stripHtml(value)
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '-')
    .replace(/&#8217;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
}

function extractImageUrls(html) {
  const urls = []
  const pattern = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi
  let match = pattern.exec(html || '')
  while (match) {
    urls.push(match[1])
    match = pattern.exec(html || '')
  }
  return urls
}

function htmlToBodyBlocks(html, mediaByUrl) {
  const blocks = []
  const parts = String(html || '')
    .replace(/<\/(p|h2|h3|h4|blockquote)>/gi, '</$1>\n')
    .split('\n')
    .map((part) => part.trim())
    .filter(Boolean)

  for (const part of parts) {
    const imageUrl = extractImageUrls(part)[0]
    const media = imageUrl ? mediaByUrl.get(imageUrl) : null
    if (media) {
      blocks.push({
        type: 'image',
        mediaId: media.id,
        alt: media.altText || null,
        caption: media.caption || null,
      })
      continue
    }

    const text = decodeHtml(part)
    if (!text) continue

    if (/^<h2/i.test(part) || /^<h3/i.test(part) || /^<h4/i.test(part)) {
      blocks.push({ type: 'heading', level: /^<h3/i.test(part) ? 3 : /^<h4/i.test(part) ? 4 : 2, text })
    } else if (/^<blockquote/i.test(part)) {
      blocks.push({ type: 'quote', text, cite: null })
    } else {
      blocks.push({ type: 'paragraph', text })
    }
  }

  if (blocks.length === 0) {
    blocks.push({ type: 'paragraph', text: decodeHtml(html) })
  }

  return blocks
}

function buildTemplateContentData(templateKey, item) {
  const defaults = {}
  const schema = TEMPLATE_CONTENT_SCHEMAS[templateKey]
  const text = decodeHtml(item.contentHtml)

  for (const field of schema.textFields) {
    defaults[field] = ''
  }
  for (const field of schema.imageFields) {
    defaults[field] = { mediaId: null }
  }

  if (templateKey === 'home') {
    defaults.heroTitle = item.title
    defaults.heroText = item.excerpt || text
  } else if (templateKey === 'about') {
    defaults.introTitle = item.title
    defaults.introText = item.excerpt || ''
    defaults.bodyText = text
  } else if (templateKey === 'contact') {
    defaults.contactIntro = text
  } else if (templateKey === 'packages') {
    defaults.introTitle = item.title
    defaults.introText = item.excerpt || text
  } else {
    defaults.bodyText = text
  }

  return defaults
}

function createReport() {
  return {
    counts: {
      pages: 0,
      posts: 0,
      categories: 0,
      authors: 0,
      media: 0,
      skipped: 0,
    },
    unmatchedPages: [],
    skippedItems: [],
    failedMedia: [],
    errors: [],
  }
}

async function assertInactiveWebsite(websiteId) {
  const website = await getWebsite(websiteId)
  if (!website) {
    throw new CmsValidationError('Website not found.', {
      code: 'WEBSITE_NOT_FOUND',
    })
  }
  if (website.isActive) {
    throw new CmsValidationError('WordPress import is allowed only for inactive websites.', {
      code: 'ACTIVE_WEBSITE_IMPORT_BLOCKED',
    })
  }
  return website
}

async function getOrCreateAuthor(websiteId, name, map, report) {
  const authorName = name || FALLBACK_AUTHOR_NAME
  const slug = normalizeSlug(authorName, 'imported-author')
  if (map.has(slug)) return map.get(slug)

  try {
    const author = await createAuthorForWebsite(
      websiteId,
      validateAuthorPayload({
        name: authorName,
        slug,
        bio: null,
        avatarImageId: null,
        isActive: true,
      })
    )
    map.set(slug, author)
    report.counts.authors += 1
    return author
  } catch {
    const authors = await listAuthors(websiteId)
    const existing = authors.find((item) => item.slug === slug)
    if (existing) {
      map.set(slug, existing)
      return existing
    }
    throw new CmsValidationError('Unable to create fallback import author.', {
      code: 'IMPORT_AUTHOR_FAILED',
    })
  }
}

async function getOrCreateCategory(websiteId, item, map, report) {
  const slug = normalizeSlug(item.slug || item.name, 'category')
  if (map.has(slug)) return map.get(slug)

  try {
    const category = await createCategoryForWebsite(
      websiteId,
      validateCategoryPayload({
        name: item.name || slug,
        slug,
        description: item.description || null,
      })
    )
    map.set(slug, category)
    report.counts.categories += 1
    return category
  } catch {
    const categories = await listCategories(websiteId)
    const existing = categories.find((category) => category.slug === slug)
    if (existing) {
      map.set(slug, existing)
      return existing
    }
    throw new CmsValidationError('Unable to create imported category.', {
      code: 'IMPORT_CATEGORY_FAILED',
    })
  }
}

async function importMediaUrl(websiteId, sourceUrl, mediaByUrl, report) {
  if (!sourceUrl) return null
  if (mediaByUrl.has(sourceUrl)) return mediaByUrl.get(sourceUrl)

  try {
    const media = await uploadImportedMedia({
      websiteId,
      sourceUrl,
      altText: null,
      caption: null,
    })
    mediaByUrl.set(sourceUrl, media)
    report.counts.media += 1
    return media
  } catch (error) {
    report.failedMedia.push({ sourceUrl, error: error.message })
    return null
  }
}

async function deleteScopedTableRows(websiteId, table, extraFilter = '') {
  await supabaseAdminRequest(
    `${table}?website_id=eq.${encodeURIComponent(websiteId)}${extraFilter}`,
    {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    }
  )
}

async function resetInactiveWebsiteData(websiteId) {
  await assertInactiveWebsite(websiteId)
  const media = await listMedia(websiteId, { includeTrashed: true })
  const importedMedia = media.filter((item) => item.source === 'wordpress_import')

  for (const item of importedMedia) {
    await deleteMediaObject(item.storagePath).catch(() => null)
  }

  for (const table of [
    'cms_posts',
    'cms_template_content',
    'cms_redirects',
    'cms_categories',
    'cms_authors',
    'cms_import_jobs',
  ]) {
    await deleteScopedTableRows(websiteId, table)
  }
  await deleteScopedTableRows(websiteId, 'cms_media', '&source=eq.wordpress_import')

  return {
    reset: true,
    deletedImportedMediaObjects: importedMedia.length,
  }
}

export async function resetWordPressImportForWebsite(websiteId) {
  return resetInactiveWebsiteData(websiteId)
}

export async function importWordPressForWebsite(websiteId, payload) {
  await assertInactiveWebsite(websiteId)
  if (!payload.confirmInactiveImport) {
    throw new CmsValidationError('Confirm inactive website import before continuing.', {
      code: 'IMPORT_CONFIRMATION_REQUIRED',
    })
  }

  const credentials = payload.wordpressUsername
    ? {
        username: payload.wordpressUsername,
        applicationPassword: payload.wordpressApplicationPassword,
      }
    : null
  let job = await createImportJob({
    websiteId,
    sourceUrl: payload.wordpressBaseUrl,
    temporaryCredentials: credentials,
  })
  const report = createReport()

  try {
    job = await updateImportJob(websiteId, job.id, {
      status: 'running',
      startedAt: new Date().toISOString(),
      report,
    })

    const data = await fetchWordPressData({
      baseUrl: payload.wordpressBaseUrl,
      credentials,
    })
    const authorsById = new Map()
    const authorBySlug = new Map()
    const categoryById = new Map()
    const categoryBySlug = new Map()
    const mediaByWpId = new Map()
    const mediaByUrl = new Map()

    for (const user of data.users) {
      const author = await getOrCreateAuthor(
        websiteId,
        user.name || user.slug,
        authorBySlug,
        report
      )
      authorsById.set(user.id, author)
    }

    for (const category of data.categories) {
      const imported = await getOrCreateCategory(websiteId, category, categoryBySlug, report)
      categoryById.set(category.id, imported)
    }

    for (const mediaItem of data.media) {
      const sourceUrl = getMediaSourceUrl(mediaItem)
      const imported = await importMediaUrl(websiteId, sourceUrl, mediaByUrl, report)
      if (imported) mediaByWpId.set(mediaItem.id, imported)
    }

    for (const page of data.pages.map(normalizeWordPressItem)) {
      const templateKey = TEMPLATE_BY_SLUG.get(page.slug)
      if (!templateKey) {
        report.unmatchedPages.push({ id: page.id, slug: page.slug, title: page.title })
        continue
      }

      try {
        await createTemplateContentForWebsite(
          websiteId,
          validateTemplateContentPayload({
            templateKey,
            path: TEMPLATE_CONTENT_SCHEMAS[templateKey].defaultPath,
            title: page.title || TEMPLATE_CONTENT_SCHEMAS[templateKey].defaultTitle,
            contentData: buildTemplateContentData(templateKey, page),
            seoTitle: page.title || null,
            metaDescription: page.excerpt || null,
            canonicalUrl: null,
            robotsMeta: null,
            ogImageId: null,
            sitemapInclude: true,
            status: page.status === 'publish' ? 'published' : 'draft',
          })
        )
        report.counts.pages += 1
      } catch (error) {
        report.skippedItems.push({ type: 'page', id: page.id, reason: error.message })
        report.counts.skipped += 1
      }
    }

    for (const rawPost of data.posts) {
      const post = normalizeWordPressItem(rawPost)
      const embeddedMedia = getEmbeddedFeaturedMedia(rawPost)
      const featuredSource =
        mediaByWpId.get(post.featuredMediaId)?.publicUrl ||
        getMediaSourceUrl(embeddedMedia)
      const featuredMedia =
        mediaByWpId.get(post.featuredMediaId) ||
        (await importMediaUrl(websiteId, featuredSource, mediaByUrl, report))
      const inlineUrls = extractImageUrls(post.contentHtml)
      for (const imageUrl of inlineUrls) {
        await importMediaUrl(websiteId, imageUrl, mediaByUrl, report)
      }

      const author =
        authorsById.get(post.authorId) ||
        (await getOrCreateAuthor(websiteId, FALLBACK_AUTHOR_NAME, authorBySlug, report))
      const category =
        categoryById.get(post.categoryIds[0]) ||
        (post.categoryIds[0]
          ? await getOrCreateCategory(
              websiteId,
              { name: `Category ${post.categoryIds[0]}` },
              categoryBySlug,
              report
            )
          : null)

      try {
        await createPostForWebsite(
          websiteId,
          validatePostPayload({
            title: post.title || `Imported Post ${post.id}`,
            slug: post.slug || normalizeSlug(post.title, `post-${post.id}`),
            excerpt: post.excerpt || null,
            authorId: author.id,
            categoryId: category?.id || null,
            featuredImageId: featuredMedia?.id || null,
            bodyBlocks: htmlToBodyBlocks(post.contentHtml, mediaByUrl),
            seoTitle: post.title || null,
            metaDescription: post.excerpt || null,
            canonicalUrl: null,
            robotsMeta: null,
            ogImageId: featuredMedia?.id || null,
            sitemapInclude: true,
            status: post.status === 'publish' ? 'published' : 'draft',
          })
        )
        report.counts.posts += 1
      } catch (error) {
        report.skippedItems.push({ type: 'post', id: post.id, reason: error.message })
        report.counts.skipped += 1
      }
    }

    job = await updateImportJob(websiteId, job.id, {
      status: 'succeeded',
      finishedAt: new Date().toISOString(),
      clearTemporaryCredentials: true,
      report,
      errorMessage: null,
    })

    return { job, report }
  } catch (error) {
    report.errors.push({ message: error.message })
    job = await updateImportJob(websiteId, job.id, {
      status: 'failed',
      finishedAt: new Date().toISOString(),
      clearTemporaryCredentials: true,
      report,
      errorMessage: error.message,
    }).catch(() => job)

    return { job, report }
  }
}
