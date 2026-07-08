import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { deactivateWebsite } from 'cms-core/cms/repositories/websites'
import { assertWebsiteId } from 'cms-core/cms/validators/websites'

async function getWebsiteId(context) {
  const params = await context.params
  return assertWebsiteId(params.id)
}

export async function POST(_request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const website = await deactivateWebsite(await getWebsiteId(context))

    return cmsJson({ website })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
