import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { getGlobalQuiz, updateGlobalQuiz } from 'cms-core/quiz/state'
import { validateQuizPayload } from 'cms-core/quiz/validators'

export async function GET() {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    return cmsJson({ quiz: await getGlobalQuiz() })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}

export async function PATCH(request) {
  const unauthorized = await requireAdminSessionResponse()
  if (unauthorized) return unauthorized

  try {
    const quiz = await updateGlobalQuiz(validateQuizPayload(await request.json()))

    return cmsJson({ quiz })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
