import { cmsErrorResponse, cmsJson, requireAdminSessionResponse } from 'cms-core/cms/http/errors'
import { triggerRevalidationForActiveWebsites } from 'cms-core/cms/services/revalidation'
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
    const revalidation = await triggerRevalidationForActiveWebsites({
      event: 'global_quiz.updated',
      resourceType: 'global_quiz',
      resourceId: quiz.quizId,
      paths: ['/', '/page-sitemap.xml', '/sitemap_index.xml'],
    })

    return cmsJson({ quiz, revalidation })
  } catch (error) {
    return cmsErrorResponse(error)
  }
}
