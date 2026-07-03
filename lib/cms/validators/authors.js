import { CmsValidationError } from '../http/errors.js'
import {
  normalizeOptionalMediaId,
  normalizeOptionalText,
  normalizeRequiredText,
  normalizeSlug,
} from './taxonomy.js'

export function validateAuthorPayload(payload) {
  const name = normalizeRequiredText(payload?.name, 'name')

  return {
    name,
    slug: normalizeSlug(payload?.slug, name),
    bio: normalizeOptionalText(payload?.bio, 'bio', 2000),
    avatarImageId: normalizeOptionalMediaId(payload?.avatarImageId),
    isActive: typeof payload?.isActive === 'boolean' ? payload.isActive : true,
  }
}

export function validateAuthorPatchPayload(payload) {
  const result = {}

  if (Object.hasOwn(payload || {}, 'name')) {
    result.name = normalizeRequiredText(payload.name, 'name')
  }

  if (Object.hasOwn(payload || {}, 'slug')) {
    result.slug = normalizeSlug(payload.slug, payload.name)
  }

  if (Object.hasOwn(payload || {}, 'bio')) {
    result.bio = normalizeOptionalText(payload.bio, 'bio', 2000)
  }

  if (Object.hasOwn(payload || {}, 'avatarImageId')) {
    result.avatarImageId = normalizeOptionalMediaId(payload.avatarImageId)
  }

  if (Object.hasOwn(payload || {}, 'isActive')) {
    if (typeof payload.isActive !== 'boolean') {
      throw new CmsValidationError('Author active status must be true or false.', {
        code: 'INVALID_AUTHOR_STATUS',
      })
    }

    result.isActive = payload.isActive
  }

  return result
}
