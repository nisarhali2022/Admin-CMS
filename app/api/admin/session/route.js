import { NextResponse } from 'next/server'
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  hasAdminSession,
  isValidAdminSecret,
} from 'cms-core/adminAuth'
import {
  clearAdminLoginFailures,
  getAdminLoginLimitStatus,
  recordFailedAdminLogin,
} from 'cms-core/auth/adminLoginRateLimit'
import { validateAdminEnv } from 'cms-core/env/adminEnv'

function jsonNoStore(body, init) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...init?.headers,
      'Cache-Control': 'no-store',
    },
  })
}

function getClientIdentifier(request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()

  return request.headers.get('x-real-ip') || 'local-admin'
}

function envErrorResponse() {
  return jsonNoStore(
    { message: 'Admin CMS environment is not configured.' },
    { status: 500 }
  )
}

export async function GET() {
  try {
    validateAdminEnv()
    return jsonNoStore({ authenticated: await hasAdminSession() })
  } catch {
    return envErrorResponse()
  }
}

export async function POST(request) {
  try {
    validateAdminEnv()
  } catch {
    return envErrorResponse()
  }

  const identifier = getClientIdentifier(request)
  const limitStatus = getAdminLoginLimitStatus(identifier)

  if (!limitStatus.allowed) {
    return jsonNoStore(
      {
        message: 'Too many failed attempts. Try again later.',
        retryAfterSeconds: limitStatus.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(limitStatus.retryAfterSeconds),
        },
      }
    )
  }

  try {
    const { secret } = await request.json()

    if (!isValidAdminSecret(secret)) {
      recordFailedAdminLogin(identifier)
      return jsonNoStore(
        { message: 'Invalid admin secret.' },
        { status: 401 }
      )
    }

    clearAdminLoginFailures(identifier)
    const response = jsonNoStore({ authenticated: true })
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      createAdminSessionToken(),
      getAdminSessionCookieOptions()
    )
    return response
  } catch {
    return jsonNoStore(
      { message: 'Unable to authenticate.' },
      { status: 400 }
    )
  }
}

export async function DELETE() {
  try {
    validateAdminEnv()
  } catch {
    return envErrorResponse()
  }

  const response = jsonNoStore({ authenticated: false })
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
  })
  return response
}
