import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { listRedirects } from 'cms-core/cms/repositories/redirects'
import { createRedirectForWebsite } from 'cms-core/cms/services/redirects'
import { getRequiredWebsiteId } from 'cms-core/cms/validators/media'
import { validateRedirectPayload } from 'cms-core/cms/validators/redirects'

export async function GET(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)

    return cmsJson({
      redirects: await listRedirects(websiteId),
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
