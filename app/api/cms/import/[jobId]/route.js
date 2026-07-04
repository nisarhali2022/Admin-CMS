import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from '@/lib/cms/http/errors'
import { getImportJob } from '@/lib/cms/repositories/importJobs'
import { assertImportJobId } from '@/lib/cms/validators/import'
import { getRequiredWebsiteId } from '@/lib/cms/validators/media'

export async function GET(request, context) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)
    const params = await context.params
    const job = await getImportJob(websiteId, assertImportJobId(params.jobId))

    if (!job) {
      return cmsJson(
        { error: 'Import job not found.', code: 'IMPORT_JOB_NOT_FOUND', details: {} },
        { status: 404 }
      )
    }

    return cmsJson({ job })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
