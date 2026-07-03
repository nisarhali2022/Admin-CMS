import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from '@/lib/cms/http/errors'
import { trashCategory } from '@/lib/cms/repositories/categories'
import { assertMediaId, getRequiredWebsiteId } from '@/lib/cms/validators/media'

async function getCategoryId(context) {
  const params = await context.params
  return assertMediaId(params.id)
}

export async function POST(request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const category = await trashCategory(websiteId, await getCategoryId(context))

    if (!category) {
      return cmsJson(
        {
          error: 'Category not found.',
          code: 'CATEGORY_NOT_FOUND',
          details: {},
        },
        { status: 404 }
      )
    }

    return cmsJson({ category })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
