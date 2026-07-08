import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { getMediaUsage } from 'cms-core/cms/repositories/media'
import { assertMediaId, getRequiredWebsiteId } from 'cms-core/cms/validators/media'

async function getMediaId(context) {
  const params = await context.params
  return assertMediaId(params.id)
}

export async function GET(request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const usage = await getMediaUsage(websiteId, await getMediaId(context))

    return cmsJson({ usage })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
