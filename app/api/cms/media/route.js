import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { listMedia } from 'cms-core/cms/repositories/media'
import { uploadMedia } from 'cms-core/cms/services/media'
import {
  getRequiredWebsiteId,
  validateMediaUploadFields,
} from 'cms-core/cms/validators/media'

export async function GET(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    const websiteId = getRequiredWebsiteId(url.searchParams)

    return cmsJson({ media: await listMedia(websiteId) })
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
    const formData = await request.formData()
    const file = formData.get('file')
    const fields = validateMediaUploadFields(formData)
    const media = await uploadMedia({
      websiteId,
      file,
      ...fields,
    })

    return cmsJson({ media }, { status: 201 })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
