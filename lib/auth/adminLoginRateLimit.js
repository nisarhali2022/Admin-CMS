const MAX_FAILED_ATTEMPTS = 5
const WINDOW_MS = 5 * 60 * 1000
const LOCKOUT_MS = 10 * 60 * 1000

const attempts = new Map()

function getState(identifier, now) {
  const existing = attempts.get(identifier)

  if (!existing || existing.expiresAt <= now) {
    return {
      count: 0,
      expiresAt: now + WINDOW_MS,
      lockedUntil: 0,
    }
  }

  return existing
}

export function getAdminLoginLimitStatus(identifier, now = Date.now()) {
  const state = getState(identifier, now)

  if (state.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((state.lockedUntil - now) / 1000),
    }
  }

  return { allowed: true, retryAfterSeconds: 0 }
}

export function recordFailedAdminLogin(identifier, now = Date.now()) {
  const state = getState(identifier, now)
  const count = state.count + 1
  const lockedUntil = count >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_MS : 0

  attempts.set(identifier, {
    count,
    expiresAt: now + WINDOW_MS,
    lockedUntil,
  })

  return getAdminLoginLimitStatus(identifier, now)
}

export function clearAdminLoginFailures(identifier) {
  attempts.delete(identifier)
}

export function resetAdminLoginRateLimitForTests() {
  attempts.clear()
}
