import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from '@/lib/cms/http/errors'
import {
  getSettingsForWebsite,
  updateSettingsForWebsite,
} from '@/lib/cms/services/settings'
import { getRequiredWebsiteId } from '@/lib/cms/validators/media'
import { validateSettingsPatchPayload } from '@/lib/cms/validators/settings'

export async function GET(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)

    return cmsJson({ settings: await getSettingsForWebsite(websiteId) })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}

export async function PATCH(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const { result, revalidation } = await updateSettingsForWebsite(
      websiteId,
      validateSettingsPatchPayload(await request.json())
    )

    return cmsJson({ settings: result, revalidation })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
