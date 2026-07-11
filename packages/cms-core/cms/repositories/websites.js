import { serializeWebsite, serializeWebsites } from '../serializers/websites.js'
import { supabaseAdminRequest, supabaseAdminRpc } from '../../supabase/adminRest.js'

const WEBSITE_SELECT =
  'id,name,slug,primary_domain,is_active,created_at,updated_at'

export async function listWebsites() {
  const rows = await supabaseAdminRequest(
    `cms_websites?select=${WEBSITE_SELECT}&order=created_at.desc`
  )

  return serializeWebsites(rows)
}

export async function getWebsite(websiteId) {
  const rows = await supabaseAdminRequest(
    `cms_websites?select=${WEBSITE_SELECT}&id=eq.${encodeURIComponent(websiteId)}&limit=1`
  )

  return serializeWebsite(rows?.[0])
}

export async function createWebsite({ name, primaryDomain }) {
  const row = await supabaseAdminRpc('cms_admin_create_website', {
    input_name: name,
    input_primary_domain: primaryDomain,
  })

  return serializeWebsite(row)
}

export async function updateWebsite(websiteId, payload) {
  const row = await supabaseAdminRpc('cms_admin_update_website', {
    input_website_id: websiteId,
    input_name: Object.hasOwn(payload, 'name') ? payload.name : null,
    input_primary_domain: Object.hasOwn(payload, 'primaryDomain')
      ? payload.primaryDomain
      : null,
    input_is_active: Object.hasOwn(payload, 'isActive') ? payload.isActive : null,
  })

  return serializeWebsite(row)
}

export async function deactivateWebsite(websiteId) {
  const row = await supabaseAdminRpc('cms_admin_deactivate_website', {
    input_website_id: websiteId,
  })

  return serializeWebsite(row)
}

export async function deleteWebsiteDatabaseRecords(websiteId) {
  return supabaseAdminRpc('cms_admin_delete_website', {
    input_website_id: websiteId,
  })
}
