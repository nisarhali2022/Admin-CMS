import { NextResponse } from 'next/server'
import { hasAdminSession } from '@/lib/adminAuth'
import { normalizeQuizQuestions } from '@/lib/quiz'
import { QuizTargetConfigError, getQuizTargets } from '@/lib/quizTargets'
import {
  QuizWordPressError,
  getQuizFromPrimaryTarget,
  saveQuizToTargets,
} from '@/lib/wordpressQuiz'

function configErrorResponse(error) {
  return NextResponse.json(
    { message: error.message },
    { status: 500 }
  )
}

export async function GET() {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const targets = getQuizTargets()
    return NextResponse.json(await getQuizFromPrimaryTarget(targets))
  } catch (error) {
    if (error instanceof QuizTargetConfigError) {
      return configErrorResponse(error)
    }

    const status = error instanceof QuizWordPressError ? 503 : 500
    return NextResponse.json(
      {
        message:
          status === 503
            ? 'The primary WordPress website is temporarily unavailable. Please try again.'
            : `Error fetching quiz: ${error.message}`,
      },
      { status }
    )
  }
}

export async function POST(request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    let normalizedQuestions
    try {
      normalizedQuestions = normalizeQuizQuestions(body.questions)
    } catch (error) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    const targets = getQuizTargets()
    const results = await saveQuizToTargets(normalizedQuestions, targets)
    const successCount = results.filter((result) => result.ok).length
    const failureCount = results.length - successCount
    const revalidateFailureCount = results.filter(
      (result) => result.ok && result.revalidate?.ok === false
    ).length

    return NextResponse.json(
      {
        message:
          failureCount > 0
            ? `Quiz saved to ${successCount} website(s), ${failureCount} failed.`
            : revalidateFailureCount > 0
              ? `Quiz saved to all websites, but ${revalidateFailureCount} cache revalidate request(s) failed.`
            : 'Quiz saved successfully to all websites.',
        data: {
          questions: normalizedQuestions,
        },
        results,
      },
      { status: successCount > 0 ? 200 : 503 }
    )
  } catch (error) {
    if (error instanceof QuizTargetConfigError) {
      return configErrorResponse(error)
    }

    return NextResponse.json(
      { message: `Error saving quiz: ${error.message}` },
      { status: 500 }
    )
  }
}
