import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from '@/lib/cms/http/errors'
import { listAuthors } from '@/lib/cms/repositories/authors'
import { createAuthorForWebsite } from '@/lib/cms/services/authors'
import { validateAuthorPayload } from '@/lib/cms/validators/authors'
import { getRequiredWebsiteId } from '@/lib/cms/validators/media'

export async function GET(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const includeTrashed = url.searchParams.get('includeTrashed') === 'true'

    return cmsJson({ authors: await listAuthors(websiteId, { includeTrashed }) })
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
