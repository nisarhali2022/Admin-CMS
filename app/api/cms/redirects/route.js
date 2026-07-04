import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from '@/lib/cms/http/errors'
import { listRedirects } from '@/lib/cms/repositories/redirects'
import { createRedirectForWebsite } from '@/lib/cms/services/redirects'
import { getRequiredWebsiteId } from '@/lib/cms/validators/media'
import { validateRedirectPayload } from '@/lib/cms/validators/redirects'

export async function GET(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const includeTrashed = url.searchParams.get('includeTrashed') === 'true'

    return cmsJson({
      redirects: await listRedirects(websiteId, { includeTrashed }),
    })
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
    const { result, revalidation } = await createRedirectForWebsite(
      websiteId,
      validateRedirectPayload(await request.json())
    )

    return cmsJson({ redirect: result, revalidation }, { status: 201 })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
