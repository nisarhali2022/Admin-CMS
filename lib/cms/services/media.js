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

function getStoragePath(websiteId, now = new Date()) {
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
  const storagePath = getStoragePath(websiteId)
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
