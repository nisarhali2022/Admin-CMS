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

function getPublicUrlForRevalidatePath(revalidateUrl, path) {
  const url = new URL(revalidateUrl)
  return new URL(path || '/', url.origin).toString()
}

async function warmRevalidatedPath(target, path) {
  const publicUrl = getPublicUrlForRevalidatePath(target.revalidateUrl, path)

  try {
    const response = await fetch(publicUrl, { cache: 'no-store' })

    return {
      ok: response.ok,
      status: response.status,
      url: publicUrl,
      message: response.ok
        ? 'Public page warm-up request completed.'
        : `Public page warm-up failed with status ${response.status}.`,
    }
  } catch {
    return {
      ok: false,
      status: null,
      url: publicUrl,
      message: 'Public page warm-up request failed.',
    }
  }
}

function getWarmPaths(target) {
  if (Array.isArray(target.revalidatePaths) && target.revalidatePaths.length > 0) {
    return target.revalidatePaths
  }

  if (target.revalidatePath) return [target.revalidatePath]

  return ['/']
}

function getRevalidateRequests(target) {
  if (target.revalidateType) {
    const body = { type: target.revalidateType }

    if (target.hasRevalidateSlug) {
      body.slug = target.revalidateSlug
    }

    return [
      {
        body,
        label: target.revalidateType,
        warmPaths: getWarmPaths(target),
      },
    ]
  }

  const paths = getWarmPaths(target)
  return paths.map((path) => ({
    body: path === '/' ? {} : { path },
    label: path,
    warmPaths: [path],
  }))
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

  const requests = getRevalidateRequests(target)
  const results = []

  for (const request of requests) {
    try {
      const response = await fetch(target.revalidateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': target.revalidateSecret,
        },
        body: JSON.stringify(request.body),
      })

      let responseBody = null
      try {
        responseBody = await response.json()
      } catch {}

      if (!response.ok || responseBody?.revalidated === false) {
        const message =
          responseBody?.message ||
          `Revalidate failed with status ${response.status}.`

        throw new QuizRevalidateError(message, { status: response.status })
      }

      const warmResults = await Promise.all(
        request.warmPaths.map((path) => warmRevalidatedPath(target, path))
      )
      const warmFailures = warmResults.filter((warm) => !warm.ok)

      results.push({
        ok: warmFailures.length === 0,
        label: request.label,
        body: request.body,
        path: request.warmPaths.join(', '),
        status: response.status,
        warm: warmResults,
        message:
          warmFailures.length === 0
            ? undefined
            : `Warm-up failed for ${warmFailures.length} page(s).`,
      })
    } catch (error) {
      results.push({
        ok: false,
        label: request.label,
        body: request.body,
        path: request.warmPaths.join(', '),
        message:
          error instanceof QuizRevalidateError
            ? error.message
            : 'Unable to revalidate this website.',
        status: error instanceof QuizRevalidateError ? error.status || null : null,
      })
    }
  }

  const failures = results.filter((result) => !result.ok)
  if (failures.length > 0) {
    return {
      configured: true,
      ok: false,
      message: `Revalidate failed for ${failures.length} request(s).`,
      requests: results,
    }
  }

  return {
    configured: true,
    ok: true,
    message: `Revalidate request accepted for ${results
      .map((result) => result.label)
      .join(', ')}.`,
    requests: results,
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
