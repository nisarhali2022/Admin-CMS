import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { getWebsite } from 'cms-core/cms/repositories/websites'
import { assertWebsiteId } from 'cms-core/cms/validators/websites'

async function getWebsiteId(context) {
  const params = await context.params
  return assertWebsiteId(params.id)
}

export async function GET(_request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const website = await getWebsite(await getWebsiteId(context))

    if (!website) {
      return cmsJson(
        {
          error: 'Website not found.',
          code: 'WEBSITE_NOT_FOUND',
          details: {},
        },
        { status: 404 }
      )
    }

    return cmsJson({ website })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
