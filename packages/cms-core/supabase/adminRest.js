import { validateAdminEnv } from '../env/adminEnv.js'

export class SupabaseAdminError extends Error {
  constructor(message, { status = 500, code = 'SUPABASE_ADMIN_ERROR', details } = {}) {
    super(message)
    this.name = 'SupabaseAdminError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function buildUrl(path) {
  const { supabaseUrl } = validateAdminEnv()
  return `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${path.replace(/^\//, '')}`
}

function getHeaders(extraHeaders = {}) {
  const { supabaseServiceRoleKey } = validateAdminEnv()

  return {
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    ...extraHeaders,
  }
}

export function getSupabaseAdminConfig() {
  return validateAdminEnv()
}

async function parseResponse(response) {
  if (response.status === 204) return null

  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function supabaseAdminRequest(path, options = {}) {
  const response = await fetch(buildUrl(path), {
    method: options.method || 'GET',
    headers: getHeaders(options.headers),
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  })

  const result = await parseResponse(response)

  if (!response.ok) {
    throw new SupabaseAdminError(
      result?.message || result?.hint || 'Supabase request failed.',
      {
        status: response.status,
        code: result?.code || 'SUPABASE_ADMIN_ERROR',
        details: result,
      }
    )
  }

  return result
}

export async function supabaseAdminRpc(functionName, payload) {
  return supabaseAdminRequest(`rpc/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: payload,
  })
}
