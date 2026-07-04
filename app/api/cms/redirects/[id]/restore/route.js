import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from '@/lib/cms/http/errors'
import { restoreRedirectForWebsite } from '@/lib/cms/services/redirects'
import { getRequiredWebsiteId } from '@/lib/cms/validators/media'
import { assertRedirectId } from '@/lib/cms/validators/redirects'

export async function POST(request, { params }) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const redirectId = assertRedirectId((await params).id)
    const { result, revalidation } = await restoreRedirectForWebsite(
      websiteId,
      redirectId
    )

    return cmsJson({ redirect: result, revalidation })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
