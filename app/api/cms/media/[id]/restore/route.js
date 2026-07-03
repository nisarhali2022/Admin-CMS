import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from '@/lib/cms/http/errors'
import { restoreMedia } from '@/lib/cms/repositories/media'
import { assertMediaId, getRequiredWebsiteId } from '@/lib/cms/validators/media'

async function getMediaId(context) {
  const params = await context.params
  return assertMediaId(params.id)
}

export async function POST(request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const media = await restoreMedia(websiteId, await getMediaId(context))

    if (!media) {
      return cmsJson(
        {
          error: 'Media not found.',
          code: 'MEDIA_NOT_FOUND',
          details: {},
        },
        { status: 404 }
      )
    }

    return cmsJson({ media })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
