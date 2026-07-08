import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { permanentlyDeleteAuthor, updateAuthorForWebsite } from 'cms-core/cms/services/authors'
import { validateAuthorPatchPayload } from 'cms-core/cms/validators/authors'
import { assertMediaId, getRequiredWebsiteId } from 'cms-core/cms/validators/media'

async function getAuthorId(context) {
  const params = await context.params
  return assertMediaId(params.id)
}

export async function PATCH(request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const author = await updateAuthorForWebsite(
      websiteId,
      await getAuthorId(context),
      validateAuthorPatchPayload(await request.json())
    )

    if (!author) {
      return cmsJson(
        {
          error: 'Author not found.',
          code: 'AUTHOR_NOT_FOUND',
          details: {},
        },
        { status: 404 }
      )
    }

    return cmsJson({ author })
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
    const authorId = await getAuthorId(context)

    return cmsJson(await permanentlyDeleteAuthor({ websiteId, authorId }))
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
