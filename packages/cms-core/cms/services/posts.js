import { CmsValidationError } from '../http/errors.js'
import { getAuthor } from '../repositories/authors.js'
import { getCategory } from '../repositories/categories.js'
import { getMedia } from '../repositories/media.js'
import {
  createPost,
  hardDeletePost,
  updatePost,
} from '../repositories/posts.js'
import { collectPostMediaIds } from '../validators/posts.js'
import { triggerRevalidation } from './revalidation.js'

async function assertAuthorBelongsToWebsite(websiteId, authorId) {
  const author = await getAuthor(websiteId, authorId)

  if (!author || !author.isActive) {
    throw new CmsValidationError(
      'Post author must be active and belong to the selected website.',
      {
        code: 'INVALID_POST_AUTHOR',
      }
    )
  }
}

async function assertCategoryBelongsToWebsite(websiteId, categoryId) {
  if (!categoryId) return

  const category = await getCategory(websiteId, categoryId)

  if (!category) {
    throw new CmsValidationError(
      'Post category must belong to the selected website.',
      {
        code: 'INVALID_POST_CATEGORY',
      }
    )
  }
}

async function assertMediaReferencesBelongToWebsite(websiteId, payload) {
  for (const mediaId of collectPostMediaIds(payload)) {
    const media = await getMedia(websiteId, mediaId)

    if (!media) {
      throw new CmsValidationError(
        'Post media references must belong to the selected website.',
        {
          code: 'INVALID_POST_MEDIA_REFERENCE',
          details: { mediaId },
        }
      )
    }
  }
}

async function assertPostReferences(websiteId, payload) {
  await assertAuthorBelongsToWebsite(websiteId, payload.authorId)
  await assertCategoryBelongsToWebsite(websiteId, payload.categoryId)
  await assertMediaReferencesBelongToWebsite(websiteId, payload)
}

function normalizeDuplicateError(error) {
  if (error?.code === '23505') {
    throw new CmsValidationError('Post slug already exists for this website.', {
      code: 'DUPLICATE_POST_SLUG',
    })
  }

  throw error
}

async function withRevalidation(result, event) {
  const revalidation = await triggerRevalidation(event)
  return { result, revalidation }
}

export async function createPostForWebsite(websiteId, payload) {
  await assertPostReferences(websiteId, payload)

  try {
    const result = await createPost(websiteId, payload)
    return withRevalidation(result, {
      websiteId,
      event: 'post.saved',
      resourceType: 'post',
      resourceId: result?.id,
    })
  } catch (error) {
    normalizeDuplicateError(error)
  }
}

export async function updatePostForWebsite(websiteId, postId, payload) {
  await assertPostReferences(websiteId, payload)

  try {
    const result = await updatePost(websiteId, postId, payload)
    return withRevalidation(result, {
      websiteId,
      event: 'post.updated',
      resourceType: 'post',
      resourceId: result?.id,
    })
  } catch (error) {
    normalizeDuplicateError(error)
  }
}

export async function permanentlyDeletePost({ websiteId, postId }) {
  await hardDeletePost(websiteId, postId)
  const revalidation = await triggerRevalidation({
    websiteId,
    event: 'post.deleted',
    resourceType: 'post',
    resourceId: postId,
  })

  return { deleted: true, postId, revalidation }
}
