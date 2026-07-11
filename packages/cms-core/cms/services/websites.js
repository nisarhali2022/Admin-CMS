import { CmsValidationError } from '../http/errors.js'
import {
  deleteWebsiteDatabaseRecords,
  getWebsite,
} from '../repositories/websites.js'
import { deleteMediaObjectsForWebsite } from '../../storage/supabaseStorage.js'

export async function permanentlyDeleteWebsite(websiteId) {
  const website = await getWebsite(websiteId)

  if (!website) {
    throw new CmsValidationError('Website not found.', {
      code: 'WEBSITE_NOT_FOUND',
    })
  }

  if (website.isActive) {
    throw new CmsValidationError(
      'Only inactive websites can be permanently deleted. Deactivate the website first.',
      { code: 'WEBSITE_MUST_BE_INACTIVE' },
    )
  }

  const storage = await deleteMediaObjectsForWebsite(websiteId)
  await deleteWebsiteDatabaseRecords(websiteId)

  return {
    deleted: true,
    websiteId,
    deletedStorageObjects: storage.objectCount,
  }
}
