const TARGET_LIMIT = 20

export class QuizTargetConfigError extends Error {
  constructor(message) {
    super(message)
    this.name = 'QuizTargetConfigError'
  }
}

function readEnv(env, key) {
  const value = env[key]
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeApiUrl(value) {
  return value.replace(/\/+$/, '')
}

function normalizeOptionalUrl(value) {
  return value ? value.replace(/\/+$/, '') : ''
}

export function getQuizTargets(env = process.env) {
  const targets = []
  const incompleteTargets = []
  const incompleteRevalidateTargets = []

  for (let index = 1; index <= TARGET_LIMIT; index++) {
    const prefix = `QUIZ_SITE_${index}_`
    const label = readEnv(env, `${prefix}LABEL`) || `Site ${index}`
    const apiUrl = readEnv(env, `${prefix}WORDPRESS_API_URL`)
    const user = readEnv(env, `${prefix}WP_ADMIN_USER`)
    const pass = readEnv(env, `${prefix}WP_ADMIN_PASS`)
    const revalidateUrl = readEnv(env, `${prefix}REVALIDATE_URL`)
    const revalidateSecret = readEnv(env, `${prefix}REVALIDATE_SECRET`)
    const revalidatePath = readEnv(env, `${prefix}REVALIDATE_PATH`)
    const providedValues = [apiUrl, user, pass].filter(Boolean)

    if (providedValues.length === 0) continue

    if (providedValues.length !== 3) {
      incompleteTargets.push(label)
      continue
    }

    const revalidateValues = [revalidateUrl, revalidateSecret].filter(Boolean)
    if (revalidateValues.length === 1) {
      incompleteRevalidateTargets.push(label)
      continue
    }

    targets.push({
      key: String(index),
      label,
      apiUrl: normalizeApiUrl(apiUrl),
      user,
      pass,
      revalidateUrl: normalizeOptionalUrl(revalidateUrl),
      revalidateSecret,
      revalidatePath,
    })
  }

  if (incompleteTargets.length > 0) {
    throw new QuizTargetConfigError(
      `Incomplete quiz target configuration for: ${incompleteTargets.join(', ')}.`
    )
  }

  if (incompleteRevalidateTargets.length > 0) {
    throw new QuizTargetConfigError(
      `Incomplete revalidate configuration for: ${incompleteRevalidateTargets.join(', ')}.`
    )
  }

  if (targets.length === 0) {
    throw new QuizTargetConfigError('No quiz websites are configured.')
  }

  return targets
}
