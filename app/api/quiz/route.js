import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { hasAdminSession } from '@/lib/adminAuth'
import { getKarachiDateISO, getKarachiDateLabel } from '@/lib/date'
import {
  formatQuizContent,
  normalizeQuizQuestions,
} from '@/lib/quiz'
import { parseQuizTables } from '@/lib/quizParser'
import { WORDPRESS_API_URL } from '@/lib/wordpressConfig'

const WP_API_URL = WORDPRESS_API_URL
const WP_USER = process.env.WP_ADMIN_USER
const WP_PASS = process.env.WP_ADMIN_PASS
const WORDPRESS_RETRY_DELAY_MS = 250

class QuizWordPressError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message, { cause })
    this.name = 'QuizWordPressError'
    this.status = status
  }
}

function createAuthHeader(user, pass) {
  const credentials = Buffer.from(`${user}:${pass}`).toString('base64')
  return `Basic ${credentials}`
}

function shouldRetryWordPress(status) {
  return !status || status === 429 || status >= 500
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getMainQuizPost() {
  const url = `${WP_API_URL}/posts?slug=daily-quiz&per_page=1`
  let lastError

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        throw new QuizWordPressError(
          `WordPress quiz lookup failed with status ${response.status}.`,
          { status: response.status }
        )
      }

      let posts
      try {
        posts = await response.json()
      } catch (error) {
        throw new QuizWordPressError(
          'WordPress quiz lookup returned invalid JSON.',
          { cause: error }
        )
      }

      if (!Array.isArray(posts)) {
        throw new QuizWordPressError(
          'WordPress quiz lookup returned an invalid response.'
        )
      }

      return posts[0] || null
    } catch (error) {
      const normalizedError =
        error instanceof QuizWordPressError
          ? error
          : new QuizWordPressError(
              'WordPress is temporarily unavailable.',
              { cause: error }
            )

      lastError = normalizedError
      if (
        attempt === 2 ||
        !shouldRetryWordPress(normalizedError.status)
      ) {
        console.error('WordPress quiz lookup unavailable', {
          status: normalizedError.status || null,
          message: normalizedError.message,
        })
        throw normalizedError
      }

      await wait(WORDPRESS_RETRY_DELAY_MS)
    }
  }

  throw lastError
}

async function saveQuizToWordPress(questions) {
  if (!WP_USER || !WP_PASS) {
    throw new Error('WordPress credentials not configured.')
  }

  const authHeader = createAuthHeader(WP_USER, WP_PASS)
  const quizContent = formatQuizContent(questions)
  const title = `Daily Quiz - ${getKarachiDateLabel()}`
  const slug = 'daily-quiz'

  const existing = await getMainQuizPost()

  const postData = {
    title,
    content: quizContent,
    slug,
    status: 'publish',
    categories: [],
  }

  const method = existing ? 'PUT' : 'POST'
  const endpoint = existing
    ? `${WP_API_URL}/posts/${existing.id}`
    : `${WP_API_URL}/posts`

  try {
    const res = await fetch(endpoint, {
      method,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.message || `WordPress API error: ${res.status}`)
    }

    return await res.json()
  } catch (err) {
    console.error('Error saving to WordPress:', err)
    throw err
  }
}

export async function GET() {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const post = await getMainQuizPost()
    if (!post) {
      return NextResponse.json({ questions: [], date: getKarachiDateISO() })
    }

    const questions = parseQuizTables(post.content.rendered)
    return NextResponse.json({
      questions,
      date: getKarachiDateISO(),
      id: post.id,
    })
  } catch (err) {
    const status = err instanceof QuizWordPressError ? 503 : 500
    return NextResponse.json(
      {
        message:
          status === 503
            ? 'WordPress is temporarily unavailable. Please try again.'
            : 'Error fetching quiz: ' + err.message,
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
    const { questions } = body

    let normalizedQuestions
    try {
      normalizedQuestions = normalizeQuizQuestions(questions)
    } catch (error) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    const post = await saveQuizToWordPress(normalizedQuestions)

    // Invalidate cached quiz data so home page shows updated quiz.
    revalidateTag('quiz')

    return NextResponse.json({
      message: 'Quiz saved successfully to WordPress',
      data: {
        questions: normalizedQuestions,
        date: getKarachiDateISO(),
        id: post.id,
      },
    })
  } catch (err) {
    console.error('Error in POST /api/quiz:', err.message)
    const status = err instanceof QuizWordPressError ? 503 : 500
    return NextResponse.json(
      {
        message:
          status === 503
            ? 'WordPress is temporarily unavailable. Quiz was not saved. Please try again.'
            : 'Error saving quiz: ' + err.message,
      },
      { status }
    )
  }
}
