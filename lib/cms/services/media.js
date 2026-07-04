import { randomUUID } from 'node:crypto'
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
  getPublicMediaUrl,
  uploadPublicMediaObject,
} from '../../storage/supabaseStorage.js'

export function getMediaStoragePath(websiteId, now = new Date()) {
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `websites/${websiteId}/media/${year}/${month}/${randomUUID()}.webp`
}

function getOriginalFilename(file) {
  const name = typeof file?.name === 'string' ? file.name.trim() : ''
  return name || 'upload'
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

  const optimized = await optimizeImageToWebp(file)
  const storagePath = getMediaStoragePath(websiteId)
  const publicUrl = getPublicMediaUrl(storagePath)

  await uploadPublicMediaObject({
    storagePath,
    bytes: optimized.bytes,
  })

  try {
    return await createMedia({
      websiteId,
      originalFilename: getOriginalFilename(file),
      storagePath,
      publicUrl,
      altText,
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
  const storagePath = getMediaStoragePath(websiteId)
  const publicUrl = getPublicMediaUrl(storagePath)

  await uploadPublicMediaObject({
    storagePath,
    bytes: optimized.bytes,
  })

  try {
    return await createMedia({
      websiteId,
      originalFilename: filename,
      storagePath,
      publicUrl,
      altText,
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

  if (!media.deletedAt) {
    throw new CmsValidationError('Trash media before permanent delete.', {
      code: 'MEDIA_NOT_TRASHED',
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
