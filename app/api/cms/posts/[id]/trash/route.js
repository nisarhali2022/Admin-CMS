import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from '@/lib/cms/http/errors'
import { trashPostForWebsite } from '@/lib/cms/services/posts'
import { getRequiredWebsiteId } from '@/lib/cms/validators/media'
import { assertPostId } from '@/lib/cms/validators/posts'

async function getPostId(context) {
  const params = await context.params
  return assertPostId(params.id)
}

export async function POST(request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const { result: post, revalidation } = await trashPostForWebsite(
      websiteId,
      await getPostId(context)
    )

    return cmsJson({ post, revalidation })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
