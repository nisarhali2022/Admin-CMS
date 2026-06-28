import { getKarachiDateISO, getKarachiDateLabel } from './date.js'
import { formatQuizContent } from './quiz.js'
import { parseQuizTables } from './quizParser.js'
import { getQuizTargets } from './quizTargets.js'

const QUIZ_POST_SLUG = 'daily-quiz'
const WORDPRESS_RETRY_DELAY_MS = 250

export class QuizWordPressError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message, { cause })
    this.name = 'QuizWordPressError'
    this.status = status
  }
}

export class QuizRevalidateError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message, { cause })
    this.name = 'QuizRevalidateError'
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

async function parseWordPressJson(response, context) {
  try {
    return await response.json()
  } catch (error) {
    throw new QuizWordPressError(
      `${context} returned invalid JSON.`,
      { status: response.status, cause: error }
    )
  }
}

async function wordpressJson(url, options, context) {
  let lastError

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, options)

      if (!response.ok) {
        let message = `${context} failed with status ${response.status}.`

        try {
          const errorBody = await response.json()
          if (errorBody?.message) message = errorBody.message
        } catch {}

        throw new QuizWordPressError(message, { status: response.status })
      }

      return await parseWordPressJson(response, context)
    } catch (error) {
      const normalizedError =
        error instanceof QuizWordPressError
          ? error
          : new QuizWordPressError(
              `${context} could not reach WordPress.`,
              { cause: error }
            )

      lastError = normalizedError

      if (
        attempt === 2 ||
        !shouldRetryWordPress(normalizedError.status)
      ) {
        throw normalizedError
      }

      await wait(WORDPRESS_RETRY_DELAY_MS)
    }
  }

  throw lastError
}

export async function getMainQuizPost(target) {
  const url = `${target.apiUrl}/posts?slug=${QUIZ_POST_SLUG}&per_page=1`
  const posts = await wordpressJson(
    url,
    {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    },
    `${target.label} quiz lookup`
  )

  if (!Array.isArray(posts)) {
    throw new QuizWordPressError(
      `${target.label} quiz lookup returned an invalid response.`
    )
  }

  return posts[0] || null
}

export async function getQuizFromPrimaryTarget(targets = getQuizTargets()) {
  const target = targets[0]
  const post = await getMainQuizPost(target)

  return {
    questions: post ? parseQuizTables(post.content?.rendered || '') : [],
    date: getKarachiDateISO(),
    id: post?.id || null,
    source: {
      key: target.key,
      label: target.label,
    },
  }
}

export async function saveQuizToTarget(target, questions) {
  const existing = await getMainQuizPost(target)
  const title = `Daily Quiz - ${getKarachiDateLabel()}`
  const postData = {
    title,
    content: formatQuizContent(questions),
    slug: QUIZ_POST_SLUG,
    status: 'publish',
    categories: [],
  }
  const endpoint = existing
    ? `${target.apiUrl}/posts/${existing.id}`
    : `${target.apiUrl}/posts`

  const post = await wordpressJson(
    endpoint,
    {
      method: existing ? 'PUT' : 'POST',
      headers: {
        Authorization: createAuthHeader(target.user, target.pass),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    },
    `${target.label} quiz save`
  )

  const revalidate = await revalidateTarget(target)

  return {
    key: target.key,
    label: target.label,
    ok: true,
    id: post.id || null,
    action: existing ? 'updated' : 'created',
    revalidate,
  }
}

export async function revalidateTarget(target) {
  if (!target.revalidateUrl) {
    return { configured: false, ok: null, message: 'Not configured.' }
  }

  const body = target.revalidatePath
    ? { path: target.revalidatePath }
    : {}

  try {
    const response = await fetch(target.revalidateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': target.revalidateSecret,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      let message = `Revalidate failed with status ${response.status}.`

      try {
        const body = await response.json()
        if (body?.message) message = body.message
      } catch {}

      throw new QuizRevalidateError(message, { status: response.status })
    }

    return { configured: true, ok: true, message: 'Revalidated.' }
  } catch (error) {
    return {
      configured: true,
      ok: false,
      message:
        error instanceof QuizRevalidateError
          ? error.message
          : 'Unable to revalidate this website.',
      status: error instanceof QuizRevalidateError ? error.status || null : null,
    }
  }
}

export async function saveQuizToTargets(questions, targets = getQuizTargets()) {
  return Promise.all(
    targets.map(async (target) => {
      try {
        return await saveQuizToTarget(target, questions)
      } catch (error) {
        return {
          key: target.key,
          label: target.label,
          ok: false,
          message:
            error instanceof QuizWordPressError
              ? error.message
              : 'Unable to update this website.',
          status: error instanceof QuizWordPressError ? error.status || null : null,
        }
      }
    })
  )
}
