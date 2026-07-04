import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from '@/lib/cms/http/errors'
import { getRedirect } from '@/lib/cms/repositories/redirects'
import {
  permanentlyDeleteRedirect,
  updateRedirectForWebsite,
} from '@/lib/cms/services/redirects'
import { getRequiredWebsiteId } from '@/lib/cms/validators/media'
import {
  assertRedirectId,
  validateRedirectPatchPayload,
} from '@/lib/cms/validators/redirects'

export async function GET(request, { params }) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const redirectId = assertRedirectId((await params).id)

    return cmsJson({ redirect: await getRedirect(websiteId, redirectId) })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}

export async function PATCH(request, { params }) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const redirectId = assertRedirectId((await params).id)
    const { result, revalidation } = await updateRedirectForWebsite(
      websiteId,
      redirectId,
      validateRedirectPatchPayload(await request.json())
    )

    return cmsJson({ redirect: result, revalidation })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const redirectId = assertRedirectId((await params).id)

    return cmsJson(await permanentlyDeleteRedirect({ websiteId, redirectId }))
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
