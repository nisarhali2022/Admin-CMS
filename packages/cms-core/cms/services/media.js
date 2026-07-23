import { CmsValidationError } from '../http/errors.js'
import {
  createMedia,
  getMedia,
  getMediaUsage,
  hardDeleteMediaRow,
  listMedia,
  updateMediaVariants,
} from '../repositories/media.js'
import { getWebsite } from '../repositories/websites.js'
import { getSettings } from '../repositories/settings.js'
import {
  createResponsiveImageVariants,
  getRequiredResponsiveImageVariantNames,
  optimizeImageToWebp,
} from '../../storage/imageOptimizer.js'
import {
  deleteMediaObject,
  downloadMediaObject,
  getPublicMediaUrl,
  listMediaObjectsUnderPrefix,
  uploadPublicMediaObject,
} from '../../storage/supabaseStorage.js'
import { triggerRevalidation } from './revalidation.js'

function getMediaStoragePrefix(websiteId, now = new Date()) {
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `websites/${websiteId}/media/${year}/${month}`
}

export function getReadableMediaFilename(filename) {
  const rawName = typeof filename === 'string' ? filename.trim() : ''
  const basename = rawName.split(/[\\/]/).pop() || 'upload'
  const withoutExtension = basename.replace(/\.[^.]+$/, '')
  const safeBase = withoutExtension
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')

  return `${safeBase || 'upload'}.webp`
}

export function getMediaStoragePath(
  websiteId,
  originalFilename = 'upload',
  now = new Date(),
  usedPaths = new Set()
) {
  const prefix = getMediaStoragePrefix(websiteId, now)
  const readableFilename = getReadableMediaFilename(originalFilename)
  const extensionIndex = readableFilename.lastIndexOf('.webp')
  const base = readableFilename.slice(0, extensionIndex)
  let candidate = readableFilename
  let suffix = 2

  while (usedPaths.has(`${prefix}/${candidate}`)) {
    candidate = `${base}-${suffix}.webp`
    suffix += 1
  }

  return `${prefix}/${candidate}`
}

export function isReadableMediaStoragePath(storagePath) {
  const filename = String(storagePath || '').split('/').pop() || ''
  return Boolean(filename) && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/i.test(filename)
}

function isStorageNameCollision(error) {
  return (
    [400, 409].includes(error?.status) &&
    /already exists|duplicate|exists/i.test(String(error?.details || error?.message || ''))
  )
}

async function uploadOptimizedMediaObject({ websiteId, originalFilename, bytes, now }) {
  const prefix = getMediaStoragePrefix(websiteId, now)
  const entries = await listMediaObjectsUnderPrefix(prefix)
  const usedPaths = new Set(entries.map((entry) => entry.path))

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const storagePath = getMediaStoragePath(
      websiteId,
      originalFilename,
      now,
      usedPaths
    )

    try {
      const uploaded = await uploadPublicMediaObject({ storagePath, bytes })
      return { ...uploaded, storagePath }
    } catch (error) {
      if (!isStorageNameCollision(error)) throw error
      usedPaths.add(storagePath)
    }
  }

  throw new CmsValidationError('Unable to allocate a unique media filename.', {
    code: 'MEDIA_FILENAME_COLLISION_LIMIT',
  })
}

function getOriginalFilename(file) {
  const name = typeof file?.name === 'string' ? file.name.trim() : ''
  return name || 'upload'
}

function getAltTextFromFilename(filename) {
  const name = typeof filename === 'string' ? filename.trim() : ''
  if (!name) return null
  return name.replace(/\.[^.]+$/, '') || null
}

export function getResponsiveVariantStoragePath(storagePath, variantName) {
  const normalizedPath = String(storagePath || '')
  if (!normalizedPath.endsWith('.webp')) {
    throw new CmsValidationError('Media variants require a WebP source image.', {
      code: 'INVALID_MEDIA_VARIANT_SOURCE',
    })
  }

  return normalizedPath.replace(/\.webp$/i, `--responsive-${variantName}.webp`)
}

async function isResponsiveImageVariantsEnabled(websiteId) {
  const settings = await getSettings(websiteId)
  return settings?.siteConfig?.responsiveImageVariants === true
}

async function uploadResponsiveImageVariants({ storagePath, bytes, existingVariants = {} }) {
  const generated = await createResponsiveImageVariants(bytes)
  const missingNames = Object.keys(generated).filter((name) => !existingVariants?.[name]?.url)
  const uploadedPaths = []
  const variants = { ...existingVariants }

  try {
    for (const name of missingNames) {
      const variant = generated[name]
      const variantStoragePath = getResponsiveVariantStoragePath(storagePath, name)
      const uploaded = await uploadOrReuseResponsiveMediaObject({
        storagePath: variantStoragePath,
        bytes: variant.bytes,
      })
      if (uploaded.created) uploadedPaths.push(variantStoragePath)
      variants[name] = {
        storagePath: uploaded.storagePath,
        url: uploaded.publicUrl,
        width: variant.width,
        height: variant.height,
        mimeType: variant.mimeType,
        fileSize: variant.fileSize,
      }
    }
  } catch (error) {
    await Promise.all(uploadedPaths.map((path) => deleteMediaObject(path).catch(() => null)))
    throw error
  }

  return { variants, uploadedPaths }
}

async function uploadOrReuseResponsiveMediaObject({ storagePath, bytes }) {
  try {
    return { ...(await uploadPublicMediaObject({ storagePath, bytes })), created: true }
  } catch (error) {
    if (!isStorageNameCollision(error)) throw error

    // A previous interrupted batch may have uploaded this immutable variant
    // before its database row was updated. Reuse that deterministic object.
    await downloadMediaObject(storagePath)
    return {
      storagePath,
      publicUrl: getPublicMediaUrl(storagePath),
      created: false,
    }
  }
}

async function createMediaWithVariants({
  websiteId,
  originalFilename,
  optimized,
  altText,
  caption,
  source,
}) {
  const uploaded = await uploadOptimizedMediaObject({
    websiteId,
    originalFilename,
    bytes: optimized.bytes,
  })
  const { storagePath, publicUrl } = uploaded
  let uploadedVariantPaths = []

  try {
    const variantsEnabled = await isResponsiveImageVariantsEnabled(websiteId)
    const { variants, uploadedPaths } = variantsEnabled
      ? await uploadResponsiveImageVariants({ storagePath, bytes: optimized.bytes })
      : { variants: {}, uploadedPaths: [] }
    uploadedVariantPaths = uploadedPaths

    return await createMedia({
      websiteId,
      originalFilename,
      storagePath,
      publicUrl,
      altText,
      caption,
      width: optimized.width,
      height: optimized.height,
      mimeType: optimized.mimeType,
      fileSize: optimized.fileSize,
      variants,
      source,
    })
  } catch (error) {
    await Promise.all([
      ...uploadedVariantPaths,
      storagePath,
    ].map((path) => deleteMediaObject(path).catch(() => null)))
    throw error
  }
}

async function assertWebsiteExists(websiteId) {
  const website = await getWebsite(websiteId)

  if (!website) {
    throw new CmsValidationError('Website not found.', {
      code: 'WEBSITE_NOT_FOUND',
    })
  }
}

export async function uploadMedia({ websiteId, file, altText, caption }) {
  await assertWebsiteExists(websiteId)

  const originalFilename = getOriginalFilename(file)
  const optimized = await optimizeImageToWebp(file)
  return createMediaWithVariants({
    websiteId,
    originalFilename,
    optimized,
    altText: altText || getAltTextFromFilename(originalFilename),
    caption,
    source: 'upload',
  })
}

function getFilenameFromUrl(url) {
  try {
    const parsed = new URL(url)
    const name = parsed.pathname.split('/').filter(Boolean).pop()
    return name || 'wordpress-image'
  } catch {
    return 'wordpress-image'
  }
}

export async function uploadImportedMedia({
  websiteId,
  sourceUrl,
  altText,
  caption,
  originalFilename,
}) {
  await assertWebsiteExists(websiteId)

  const response = await fetch(sourceUrl, { cache: 'no-store' })
  if (!response.ok) {
    throw new CmsValidationError('Unable to fetch WordPress image.', {
      code: 'WORDPRESS_IMAGE_FETCH_FAILED',
      details: { sourceUrl, status: response.status },
    })
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const filename = originalFilename || getFilenameFromUrl(sourceUrl)
  const file = {
    name: filename,
    type: contentType.split(';')[0],
    size: bytes.byteLength,
    arrayBuffer: async () => bytes,
  }
  const optimized = await optimizeImageToWebp(file)
  return createMediaWithVariants({
    websiteId,
    originalFilename: filename,
    optimized,
    altText: altText || getAltTextFromFilename(filename),
    caption,
    source: 'wordpress_import',
  })
}

function getMissingResponsiveVariantNames(media) {
  const requiredNames = getRequiredResponsiveImageVariantNames(media?.width)
  return requiredNames.filter((name) => !media?.variants?.[name]?.url)
}

export async function backfillResponsiveMediaVariants({ websiteId, limit = 5 }) {
  await assertWebsiteExists(websiteId)

  if (!(await isResponsiveImageVariantsEnabled(websiteId))) {
    throw new CmsValidationError('Enable responsive image variants in Settings before backfilling media.', {
      code: 'RESPONSIVE_IMAGE_VARIANTS_DISABLED',
    })
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 10)
  const media = await listMedia(websiteId)
  const pending = media.filter((item) => getMissingResponsiveVariantNames(item).length > 0)
  const batch = pending.slice(0, safeLimit)
  const failures = []
  let updatedCount = 0

  for (const item of batch) {
    let uploadedPaths = []
    try {
      const bytes = await downloadMediaObject(item.storagePath)
      const missingNames = getMissingResponsiveVariantNames(item)
      const generated = await createResponsiveImageVariants(bytes, { variantNames: missingNames })
      const variants = { ...(item.variants || {}) }

      for (const name of missingNames) {
        const variant = generated[name]
        if (!variant) continue
        const variantStoragePath = getResponsiveVariantStoragePath(item.storagePath, name)
        const uploaded = await uploadOrReuseResponsiveMediaObject({ storagePath: variantStoragePath, bytes: variant.bytes })
        if (uploaded.created) uploadedPaths.push(variantStoragePath)
        variants[name] = {
          storagePath: uploaded.storagePath,
          url: uploaded.publicUrl,
          width: variant.width,
          height: variant.height,
          mimeType: variant.mimeType,
          fileSize: variant.fileSize,
        }
      }

      await updateMediaVariants(websiteId, item.id, variants)
      updatedCount += 1
    } catch (error) {
      await Promise.all(uploadedPaths.map((path) => deleteMediaObject(path).catch(() => null)))
      failures.push({ mediaId: item.id, message: error?.message || 'Unable to generate variants.' })
    }
  }

  const revalidation = updatedCount > 0
    ? await triggerRevalidation({
      websiteId,
      event: 'media.variants.updated',
      resourceType: 'media',
      paths: ['/', '/blog', '/sitemap_index.xml'],
    })
    : null

  return {
    processedCount: batch.length,
    updatedCount,
    remainingCount: Math.max(pending.length - batch.length + failures.length, 0),
    failures,
    revalidation,
  }
}

export async function permanentlyDeleteMedia({ websiteId, mediaId }) {
  const media = await getMedia(websiteId, mediaId)

  if (!media) {
    throw new CmsValidationError('Media not found.', {
      code: 'MEDIA_NOT_FOUND',
    })
  }

  const usage = await getMediaUsage(websiteId, mediaId)

  if (usage?.referenced) {
    throw new CmsValidationError('Referenced media cannot be permanently deleted.', {
      code: 'MEDIA_IN_USE',
      details: { usage: usage.locations || [] },
    })
  }

  const variantPaths = Object.values(media.variants || {})
    .map((variant) => variant?.storagePath)
    .filter(Boolean)
  await Promise.all([...variantPaths, media.storagePath].map((path) => deleteMediaObject(path)))
  await hardDeleteMediaRow(websiteId, mediaId)

  return { deleted: true, mediaId }
}
