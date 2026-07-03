import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from '@/lib/cms/http/errors'
import {
  createWebsite,
  listWebsites,
} from '@/lib/cms/repositories/websites'
import { validateCreateWebsitePayload } from '@/lib/cms/validators/websites'

export async function GET() {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    return cmsJson({ websites: await listWebsites() })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}

export async function POST(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const payload = validateCreateWebsitePayload(await request.json())
    const website = await createWebsite(payload)

    return cmsJson({ website }, { status: 201 })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
