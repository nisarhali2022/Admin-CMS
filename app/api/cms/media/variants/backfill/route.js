import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { backfillResponsiveMediaVariants } from 'cms-core/cms/services/media'
import { getRequiredWebsiteId } from 'cms-core/cms/validators/media'

function getBatchLimit(value) {
  const limit = Number(value)
  return Number.isInteger(limit) && limit > 0 ? Math.min(limit, 10) : 5
}

export async function POST(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const body = await request.json().catch(() => ({}))
    const result = await backfillResponsiveMediaVariants({
      websiteId,
      limit: getBatchLimit(body.limit),
    })

    return cmsJson({ backfill: result })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
