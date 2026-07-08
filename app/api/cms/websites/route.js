import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { listWebsites } from 'cms-core/cms/repositories/websites'

export async function GET() {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    return cmsJson({ websites: await listWebsites() })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
