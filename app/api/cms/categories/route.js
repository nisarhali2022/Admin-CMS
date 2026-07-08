import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { listCategories } from 'cms-core/cms/repositories/categories'
import { createCategoryForWebsite } from 'cms-core/cms/services/categories'
import { validateCategoryPayload } from 'cms-core/cms/validators/categories'
import { getRequiredWebsiteId } from 'cms-core/cms/validators/media'

export async function GET(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)

    return cmsJson({
      categories: await listCategories(websiteId),
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
    const category = await createCategoryForWebsite(
      websiteId,
      validateCategoryPayload(await request.json())
    )

    return cmsJson({ category }, { status: 201 })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
