import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { updateMediaMetadata } from 'cms-core/cms/repositories/media'
import { permanentlyDeleteMedia } from 'cms-core/cms/services/media'
import {
  assertMediaId,
  getRequiredWebsiteId,
  validateMediaPatchPayload,
} from 'cms-core/cms/validators/media'

async function getMediaId(context) {
  const params = await context.params
  return assertMediaId(params.id)
}

export async function PATCH(request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const mediaId = await getMediaId(context)
    const payload = validateMediaPatchPayload(await request.json())
    const media = await updateMediaMetadata(websiteId, mediaId, payload)

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

export async function DELETE(request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const mediaId = await getMediaId(context)

    return cmsJson(await permanentlyDeleteMedia({ websiteId, mediaId }))
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
