import { NextResponse } from 'next/server'
import { hasAdminSession } from '../../adminAuth.js'
import { validateAdminEnv } from '../../env/adminEnv.js'
import { SupabaseAdminError } from '../../supabase/adminRest.js'
import { ImageValidationError } from '../../storage/imageOptimizer.js'
import { StorageError } from '../../storage/supabaseStorage.js'

export class CmsValidationError extends Error {
  constructor(message, { code = 'VALIDATION_ERROR', details = {} } = {}) {
    super(message)
    this.name = 'CmsValidationError'
    this.status = 400
    this.code = code
    this.details = details
  }
}

export function cmsJson(body, init) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...init?.headers,
      'Cache-Control': 'no-store',
    },
  })
}

export function cmsErrorResponse(error) {
  if (error instanceof CmsValidationError) {
    return cmsJson(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.status }
    )
  }

  if (error instanceof SupabaseAdminError) {
    const duplicate = error.code === '23505'
    const notFound = error.code === 'P0002'

    return cmsJson(
      {
        error: duplicate
          ? 'A website with that domain already exists.'
          : notFound
            ? 'Website not found.'
            : error.message,
        code: duplicate
          ? 'DUPLICATE_DOMAIN'
          : notFound
            ? 'WEBSITE_NOT_FOUND'
            : error.code,
        details: error.details || {},
      },
      { status: duplicate ? 409 : notFound ? 404 : error.status }
    )
  }

  if (error instanceof ImageValidationError) {
    return cmsJson(
      {
        error: error.message,
        code: error.code,
        details: {},
      },
      { status: error.status }
    )
  }

  if (error instanceof StorageError) {
    return cmsJson(
      {
        error: error.message,
        code: 'STORAGE_ERROR',
        details: error.details || {},
      },
      { status: error.status }
    )
  }

  return cmsJson(
    {
      error: 'Unexpected CMS error.',
      code: 'CMS_ERROR',
      details: {},
    },
    { status: 500 }
  )
}

export async function requireAdminSessionResponse() {
  try {
    validateAdminEnv()
  } catch {
    return cmsJson(
      {
        error: 'Admin CMS environment is not configured.',
        code: 'ADMIN_ENV_NOT_CONFIGURED',
        details: {},
      },
      { status: 500 }
    )
  }

  if (!(await hasAdminSession())) {
    return cmsJson(
      {
        error: 'Admin session required.',
        code: 'ADMIN_SESSION_REQUIRED',
        details: {},
      },
      { status: 401 }
    )
  }

  return null
}
