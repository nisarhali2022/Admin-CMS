import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from '@/lib/cms/http/errors'
import { updateCategoryForWebsite, permanentlyDeleteCategory } from '@/lib/cms/services/categories'
import { assertMediaId, getRequiredWebsiteId } from '@/lib/cms/validators/media'
import { validateCategoryPatchPayload } from '@/lib/cms/validators/categories'

async function getCategoryId(context) {
  const params = await context.params
  return assertMediaId(params.id)
}

export async function PATCH(request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const category = await updateCategoryForWebsite(
      websiteId,
      await getCategoryId(context),
      validateCategoryPatchPayload(await request.json())
    )

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

export async function DELETE(request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const categoryId = await getCategoryId(context)

    return cmsJson(await permanentlyDeleteCategory({ websiteId, categoryId }))
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
