import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from '@/lib/cms/http/errors'
import { getTemplateContent } from '@/lib/cms/repositories/templateContent'
import {
  permanentlyDeleteTemplateContent,
  updateTemplateContentForWebsite,
} from '@/lib/cms/services/templateContent'
import { getRequiredWebsiteId } from '@/lib/cms/validators/media'
import {
  assertTemplateContentId,
  validateTemplateContentPatchPayload,
} from '@/lib/cms/validators/templateContent'

async function getTemplateId(context) {
  const params = await context.params
  return assertTemplateContentId(params.id)
}

export async function GET(request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const template = await getTemplateContent(websiteId, await getTemplateId(context))

    if (!template) {
      return cmsJson(
        {
          error: 'Template content not found.',
          code: 'TEMPLATE_CONTENT_NOT_FOUND',
          details: {},
        },
        { status: 404 }
      )
    }

    return cmsJson({ template })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}

export async function PATCH(request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const { result: template, revalidation } =
      await updateTemplateContentForWebsite(
        websiteId,
        await getTemplateId(context),
        validateTemplateContentPatchPayload(await request.json())
      )

    if (!template) {
      return cmsJson(
        {
          error: 'Template content not found.',
          code: 'TEMPLATE_CONTENT_NOT_FOUND',
          details: {},
        },
        { status: 404 }
      )
    }

    return cmsJson({ template, revalidation })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}

export async function DELETE(request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const templateContentId = await getTemplateId(context)

    return cmsJson(
      await permanentlyDeleteTemplateContent({ websiteId, templateContentId })
    )
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
