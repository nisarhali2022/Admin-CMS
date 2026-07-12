import {
  cmsErrorResponse,
  cmsJson,
  requireAdminSessionResponse,
} from 'cms-core/cms/http/errors'
import { migrateMediaFilenamesForWebsite } from 'cms-core/cms/services/mediaFilenameMigration'
import { getRequiredWebsiteId } from 'cms-core/cms/validators/media'

export async function POST(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const websiteId = getRequiredWebsiteId(new URL(request.url).searchParams)
    return cmsJson(await migrateMediaFilenamesForWebsite(websiteId))
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
