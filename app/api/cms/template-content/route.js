import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from '@/lib/cms/http/errors'
import { listTemplateContent } from '@/lib/cms/repositories/templateContent'
import { createTemplateContentForWebsite } from '@/lib/cms/services/templateContent'
import { getRequiredWebsiteId } from '@/lib/cms/validators/media'
import { validateTemplateContentPayload } from '@/lib/cms/validators/templateContent'

export async function GET(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const includeTrashed = url.searchParams.get('includeTrashed') === 'true'

    return cmsJson({
      templates: await listTemplateContent(websiteId, { includeTrashed }),
    })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}

export async function POST(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const { result: template, revalidation } =
      await createTemplateContentForWebsite(
        websiteId,
        validateTemplateContentPayload(await request.json())
      )

    return cmsJson({ template, revalidation }, { status: 201 })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
