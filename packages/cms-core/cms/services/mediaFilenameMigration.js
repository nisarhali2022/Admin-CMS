import { listMedia, updateMediaStorageLocation } from '../repositories/media.js'
import { triggerRevalidation } from './revalidation.js'
import {
  deleteMediaObject,
  downloadMediaObject,
  getPublicMediaUrl,
  listMediaObjectsUnderPrefix,
  uploadPublicMediaObject,
} from '../../storage/supabaseStorage.js'
import {
  getMediaStoragePath,
  getReadableMediaFilename,
  isReadableMediaStoragePath,
} from './media.js'

function migrationDate(media) {
  const date = new Date(media.createdAt || '')
  return Number.isNaN(date.getTime()) ? new Date() : date
}

export async function migrateMediaFilenamesForWebsite(websiteId) {
  const [media, objects] = await Promise.all([
    listMedia(websiteId),
    listMediaObjectsUnderPrefix(`websites/${websiteId}`),
  ])
  const usedPaths = new Set(objects.map((object) => object.path))
  const report = {
    websiteId,
    total: media.length,
    migrated: 0,
    skipped: 0,
    failed: 0,
    collisionRenamed: 0,
    failures: [],
    warnings: [],
    revalidation: null,
  }

  for (const item of media) {
    if (isReadableMediaStoragePath(item.storagePath)) {
      report.skipped += 1
      continue
    }

    const oldPath = item.storagePath
    let newPath = null

    try {
      const bytes = await downloadMediaObject(oldPath)
      newPath = getMediaStoragePath(
        websiteId,
        item.originalFilename,
        migrationDate(item),
        usedPaths
      )
      const expectedFilename = newPath.split('/').pop()
      const readableFilename = getReadableMediaFilename(item.originalFilename)
      if (expectedFilename !== readableFilename) {
        report.collisionRenamed += 1
      }

      await uploadPublicMediaObject({ storagePath: newPath, bytes })
      await updateMediaStorageLocation(websiteId, item.id, {
        storagePath: newPath,
        publicUrl: getPublicMediaUrl(newPath),
      })
      usedPaths.add(newPath)
      report.migrated += 1

      try {
        await deleteMediaObject(oldPath)
      } catch (error) {
        report.warnings.push({
          mediaId: item.id,
          message: error?.message || 'Unable to delete the old media object.',
        })
      }
    } catch (error) {
      if (newPath) await deleteMediaObject(newPath).catch(() => null)
      report.failed += 1
      report.failures.push({
        mediaId: item.id,
        storagePath: oldPath,
        message: error?.message || 'Unable to migrate media object.',
      })
    }
  }

  if (report.migrated > 0) {
    report.revalidation = await triggerRevalidation({
      websiteId,
      event: 'media.paths-migrated',
      resourceType: 'media',
    })
  }

  return report
}
