import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from '@/lib/cms/http/errors'
import { listImportJobs } from '@/lib/cms/repositories/importJobs'
import { importWordPressForWebsite } from '@/lib/cms/services/import'
import { validateWordPressImportPayload } from '@/lib/cms/validators/import'
import { getRequiredWebsiteId } from '@/lib/cms/validators/media'

export async function GET(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)

    return cmsJson({ jobs: await listImportJobs(websiteId) })
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
    const { job, report } = await importWordPressForWebsite(
      websiteId,
      validateWordPressImportPayload(await request.json())
    )

    return cmsJson({ job, report }, { status: 201 })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
