import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from '@/lib/cms/http/errors'
import { unpublishTemplateContentForWebsite } from '@/lib/cms/services/templateContent'
import { getRequiredWebsiteId } from '@/lib/cms/validators/media'
import { assertTemplateContentId } from '@/lib/cms/validators/templateContent'

async function getTemplateId(context) {
  const params = await context.params
  return assertTemplateContentId(params.id)
}

export async function POST(request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const { result: template, revalidation } =
      await unpublishTemplateContentForWebsite(
        websiteId,
        await getTemplateId(context)
      )

    return cmsJson({ template, revalidation })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
