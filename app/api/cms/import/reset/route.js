import {
  CmsValidationError,
  cmsErrorResponse,
  cmsJson,
  requireAdminSessionResponse,
} from '@/lib/cms/http/errors'
import { resetWordPressImportForWebsite } from '@/lib/cms/services/import'
import { validateImportResetPayload } from '@/lib/cms/validators/import'
import { getRequiredWebsiteId } from '@/lib/cms/validators/media'

export async function POST(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const payload = validateImportResetPayload(await request.json().catch(() => ({})))

    if (!payload.confirmReset) {
      throw new CmsValidationError('Confirm import reset before continuing.', {
        code: 'IMPORT_RESET_CONFIRMATION_REQUIRED',
      })
    }

    return cmsJson(await resetWordPressImportForWebsite(websiteId))
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
