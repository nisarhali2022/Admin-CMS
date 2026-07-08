import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { listPages } from 'cms-core/cms/repositories/pages'
import { createPageForWebsite } from 'cms-core/cms/services/pages'
import { getRequiredWebsiteId } from 'cms-core/cms/validators/media'
import { validatePagePayload } from 'cms-core/cms/validators/pages'

export async function GET(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)

    return cmsJson({ pages: await listPages(websiteId) })
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
    const { result: page, revalidation } = await createPageForWebsite(
      websiteId,
      validatePagePayload(await request.json())
    )

    return cmsJson({ page, revalidation }, { status: 201 })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
