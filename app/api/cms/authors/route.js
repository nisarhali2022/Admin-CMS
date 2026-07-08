import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { listAuthors } from 'cms-core/cms/repositories/authors'
import { createAuthorForWebsite } from 'cms-core/cms/services/authors'
import { validateAuthorPayload } from 'cms-core/cms/validators/authors'
import { getRequiredWebsiteId } from 'cms-core/cms/validators/media'

export async function GET(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)

    return cmsJson({ authors: await listAuthors(websiteId) })
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
    const author = await createAuthorForWebsite(
      websiteId,
      validateAuthorPayload(await request.json())
    )

    return cmsJson({ author }, { status: 201 })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
