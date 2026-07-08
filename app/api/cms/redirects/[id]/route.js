import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { getRedirect } from 'cms-core/cms/repositories/redirects'
import {
  permanentlyDeleteRedirect,
  updateRedirectForWebsite,
} from 'cms-core/cms/services/redirects'
import { getRequiredWebsiteId } from 'cms-core/cms/validators/media'
import {
  assertRedirectId,
  validateRedirectPatchPayload,
} from 'cms-core/cms/validators/redirects'

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
