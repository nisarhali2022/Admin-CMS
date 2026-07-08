import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { listTemplateContent } from 'cms-core/cms/repositories/templateContent'
import { createTemplateContentForWebsite } from 'cms-core/cms/services/templateContent'
import { getRequiredWebsiteId } from 'cms-core/cms/validators/media'
import { validateTemplateContentPayload } from 'cms-core/cms/validators/templateContent'

export async function GET(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)

    return cmsJson({
      templates: await listTemplateContent(websiteId),
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
