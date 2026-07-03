import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from '@/lib/cms/http/errors'
import { updateMediaMetadata } from '@/lib/cms/repositories/media'
import { permanentlyDeleteMedia } from '@/lib/cms/services/media'
import {
  assertMediaId,
  getRequiredWebsiteId,
  validateMediaPatchPayload,
} from '@/lib/cms/validators/media'

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
