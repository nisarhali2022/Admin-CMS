import { CmsValidationError } from '../http/errors.js'
import {
  createMedia,
  getMedia,
  getMediaUsage,
  hardDeleteMediaRow,
} from '../repositories/media.js'
import { getWebsite } from '../repositories/websites.js'
import { optimizeImageToWebp } from '../../storage/imageOptimizer.js'
import {
  deleteMediaObject,
  listMediaObjectsUnderPrefix,
  uploadPublicMediaObject,
} from '../../storage/supabaseStorage.js'

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
  const uploaded = await uploadOptimizedMediaObject({
    websiteId,
    originalFilename,
    bytes: optimized.bytes,
  })
  const { storagePath, publicUrl } = uploaded

  try {
    return await createMedia({
      websiteId,
      originalFilename,
      storagePath,
      publicUrl,
      altText: altText || getAltTextFromFilename(originalFilename),
      caption,
      width: optimized.width,
      height: optimized.height,
      mimeType: optimized.mimeType,
      fileSize: optimized.fileSize,
      source: 'upload',
    })
  } catch (error) {
    await deleteMediaObject(storagePath).catch(() => null)
    throw error
  }
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
  const uploaded = await uploadOptimizedMediaObject({
    websiteId,
    originalFilename: filename,
    bytes: optimized.bytes,
  })
  const { storagePath, publicUrl } = uploaded

  try {
    return await createMedia({
      websiteId,
      originalFilename: filename,
      storagePath,
      publicUrl,
      altText: altText || getAltTextFromFilename(filename),
      caption,
      width: optimized.width,
      height: optimized.height,
      mimeType: optimized.mimeType,
      fileSize: optimized.fileSize,
      source: 'wordpress_import',
    })
  } catch (error) {
    await deleteMediaObject(storagePath).catch(() => null)
    throw error
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

  await deleteMediaObject(media.storagePath)
  await hardDeleteMediaRow(websiteId, mediaId)

  return { deleted: true, mediaId }
}
