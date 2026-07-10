import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { getCmsStorageUsage } from 'cms-core/storage/supabaseStorage'

export async function GET() {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    return cmsJson({ storage: await getCmsStorageUsage() })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
