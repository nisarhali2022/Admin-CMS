import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { getImportJob } from 'cms-core/cms/repositories/importJobs'
import { assertImportJobId } from 'cms-core/cms/validators/import'
import { getRequiredWebsiteId } from 'cms-core/cms/validators/media'

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
