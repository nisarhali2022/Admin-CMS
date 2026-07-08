import { serializeRedirect, serializeRedirects } from '../serializers/redirects.js'
import { supabaseAdminRequest } from '../../supabase/adminRest.js'

const REDIRECT_SELECT =
  'id,website_id,from_path,to_url,redirect_type,is_active,hit_count,last_hit_at,created_at,updated_at'

function toDatabasePayload(payload) {
  const row = {}

  if (Object.hasOwn(payload, 'fromPath')) row.from_path = payload.fromPath
  if (Object.hasOwn(payload, 'toUrl')) row.to_url = payload.toUrl
  if (Object.hasOwn(payload, 'redirectType')) row.redirect_type = payload.redirectType
  if (Object.hasOwn(payload, 'isActive')) row.is_active = payload.isActive

  return row
}

export async function listRedirects(websiteId) {
  const rows = await supabaseAdminRequest(
    `cms_redirects?select=${REDIRECT_SELECT}&website_id=eq.${encodeURIComponent(websiteId)}&order=from_path.asc`
  )

  return serializeRedirects(rows)
}

export async function getRedirect(websiteId, redirectId) {
  const rows = await supabaseAdminRequest(
    `cms_redirects?select=${REDIRECT_SELECT}&website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(redirectId)}&limit=1`
  )

  return serializeRedirect(rows?.[0])
}

export async function createRedirect(websiteId, payload) {
  const rows = await supabaseAdminRequest('cms_redirects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: {
      website_id: websiteId,
      ...toDatabasePayload(payload),
    },
  })

  return serializeRedirect(rows?.[0])
}

export async function updateRedirect(websiteId, redirectId, payload) {
  const rows = await supabaseAdminRequest(
    `cms_redirects?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(redirectId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: toDatabasePayload(payload),
    }
  )

  return serializeRedirect(rows?.[0])
}

export async function hardDeleteRedirect(websiteId, redirectId) {
  await supabaseAdminRequest(
    `cms_redirects?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(redirectId)}`,
    {
      method: 'DELETE',
      headers: {
        Prefer: 'return=minimal',
      },
    }
  )
}
