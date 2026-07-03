import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from '@/lib/cms/http/errors'
import { restoreAuthor } from '@/lib/cms/repositories/authors'
import { assertMediaId, getRequiredWebsiteId } from '@/lib/cms/validators/media'

async function getAuthorId(context) {
  const params = await context.params
  return assertMediaId(params.id)
}

export async function POST(request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const author = await restoreAuthor(websiteId, await getAuthorId(context))

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
