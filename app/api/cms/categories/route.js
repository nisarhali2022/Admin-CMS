import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from '@/lib/cms/http/errors'
import { listCategories } from '@/lib/cms/repositories/categories'
import { createCategoryForWebsite } from '@/lib/cms/services/categories'
import { validateCategoryPayload } from '@/lib/cms/validators/categories'
import { getRequiredWebsiteId } from '@/lib/cms/validators/media'

export async function GET(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const includeTrashed = url.searchParams.get('includeTrashed') === 'true'

    return cmsJson({
      categories: await listCategories(websiteId, { includeTrashed }),
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
