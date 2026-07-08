import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { getPost } from 'cms-core/cms/repositories/posts'
import { permanentlyDeletePost, updatePostForWebsite } from 'cms-core/cms/services/posts'
import { getRequiredWebsiteId } from 'cms-core/cms/validators/media'
import { assertPostId, validatePostPatchPayload } from 'cms-core/cms/validators/posts'

async function getPostId(context) {
  const params = await context.params
  return assertPostId(params.id)
}

export async function GET(request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const post = await getPost(websiteId, await getPostId(context))

    if (!post) {
      return cmsJson(
        { error: 'Post not found.', code: 'POST_NOT_FOUND', details: {} },
        { status: 404 }
      )
    }

    return cmsJson({ post })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}

export async function PATCH(request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const { result: post, revalidation } = await updatePostForWebsite(
      websiteId,
      await getPostId(context),
      validatePostPatchPayload(await request.json())
    )

    if (!post) {
      return cmsJson(
        { error: 'Post not found.', code: 'POST_NOT_FOUND', details: {} },
        { status: 404 }
      )
    }

    return cmsJson({ post, revalidation })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}

export async function DELETE(request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const postId = await getPostId(context)

    return cmsJson(await permanentlyDeletePost({ websiteId, postId }))
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
