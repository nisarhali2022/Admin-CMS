import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { listPosts } from 'cms-core/cms/repositories/posts'
import { createPostForWebsite } from 'cms-core/cms/services/posts'
import { getRequiredWebsiteId } from 'cms-core/cms/validators/media'
import { validatePostPayload } from 'cms-core/cms/validators/posts'

export async function GET(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)

    return cmsJson({ posts: await listPosts(websiteId) })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}

export async function POST(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const { result: post, revalidation } = await createPostForWebsite(
      websiteId,
      validatePostPayload(await request.json())
    )

    return cmsJson({ post, revalidation }, { status: 201 })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
