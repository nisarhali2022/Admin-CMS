import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { getPage } from 'cms-core/cms/repositories/pages'
import { permanentlyDeletePage, updatePageForWebsite } from 'cms-core/cms/services/pages'
import { getRequiredWebsiteId } from 'cms-core/cms/validators/media'
import { assertPageId, validatePagePatchPayload } from 'cms-core/cms/validators/pages'

async function getPageId(context) {
  const params = await context.params
  return assertPageId(params.id)
}

export async function GET(request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const page = await getPage(websiteId, await getPageId(context))

    if (!page) {
      return cmsJson(
        { error: 'Page not found.', code: 'PAGE_NOT_FOUND', details: {} },
        { status: 404 }
      )
    }

    return cmsJson({ page })
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
    const { result: page, revalidation } = await updatePageForWebsite(
      websiteId,
      await getPageId(context),
      validatePagePatchPayload(await request.json())
    )

    if (!page) {
      return cmsJson(
        { error: 'Page not found.', code: 'PAGE_NOT_FOUND', details: {} },
        { status: 404 }
      )
    }

    return cmsJson({ page, revalidation })
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
    const pageId = await getPageId(context)

    return cmsJson(await permanentlyDeletePage({ websiteId, pageId }))
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
