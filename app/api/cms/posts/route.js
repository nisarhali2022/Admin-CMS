import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from '@/lib/cms/http/errors'
import { listPosts } from '@/lib/cms/repositories/posts'
import { createPostForWebsite } from '@/lib/cms/services/posts'
import { getRequiredWebsiteId } from '@/lib/cms/validators/media'
import { validatePostPayload } from '@/lib/cms/validators/posts'

export async function GET(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const includeTrashed = url.searchParams.get('includeTrashed') === 'true'

    return cmsJson({ posts: await listPosts(websiteId, { includeTrashed }) })
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
