import { CmsValidationError } from '../http/errors.js'
import {
  createAuthor,
  hardDeleteAuthor,
  updateAuthor,
} from '../repositories/authors.js'
import { getMedia } from '../repositories/media.js'
import { supabaseAdminRequest } from '../../supabase/adminRest.js'

async function authorHasPosts(websiteId, authorId) {
  const rows = await supabaseAdminRequest(
    `cms_posts?select=id&website_id=eq.${encodeURIComponent(websiteId)}&author_id=eq.${encodeURIComponent(authorId)}&limit=1`
  )

  return Array.isArray(rows) && rows.length > 0
}

async function assertAvatarBelongsToWebsite(websiteId, avatarImageId) {
  if (!avatarImageId) return

  const media = await getMedia(websiteId, avatarImageId)

  if (!media || media.deletedAt) {
    throw new CmsValidationError('Author avatar image must belong to the selected website.', {
      code: 'INVALID_AUTHOR_AVATAR',
    })
  }
}

function normalizeDuplicateError(error) {
  if (error?.code === '23505') {
    throw new CmsValidationError('Author slug already exists for this website.', {
      code: 'DUPLICATE_AUTHOR_SLUG',
    })
  }

  throw error
}

export async function createAuthorForWebsite(websiteId, payload) {
  await assertAvatarBelongsToWebsite(websiteId, payload.avatarImageId)

  try {
    return await createAuthor(websiteId, payload)
  } catch (error) {
    normalizeDuplicateError(error)
  }
}

export async function updateAuthorForWebsite(websiteId, authorId, payload) {
  if (Object.hasOwn(payload, 'avatarImageId')) {
    await assertAvatarBelongsToWebsite(websiteId, payload.avatarImageId)
  }

  try {
    return await updateAuthor(websiteId, authorId, payload)
  } catch (error) {
    normalizeDuplicateError(error)
  }
}

export async function permanentlyDeleteAuthor({ websiteId, authorId }) {
  if (await authorHasPosts(websiteId, authorId)) {
    throw new CmsValidationError(
      'Author is used by posts and cannot be permanently deleted.',
      {
        code: 'AUTHOR_IN_USE',
      }
    )
  }

  await hardDeleteAuthor(websiteId, authorId)
  return { deleted: true, authorId }
}
