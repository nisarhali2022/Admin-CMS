import { encryptSecret } from '../crypto/secrets.js'
import { serializeSettings } from '../serializers/settings.js'
import { supabaseAdminRequest } from '../../supabase/adminRest.js'

const SETTINGS_SELECT =
  'id,website_id,robots_txt,sitemap_settings,seo_defaults,site_config,adsense_settings,revalidation_url,revalidation_secret_encrypted,created_at,updated_at'

function toDatabasePayload(payload) {
  const row = {}

  if (Object.hasOwn(payload, 'robotsTxt')) row.robots_txt = payload.robotsTxt
  if (Object.hasOwn(payload, 'sitemapSettings')) {
    row.sitemap_settings = payload.sitemapSettings
  }
  if (Object.hasOwn(payload, 'seoDefaults')) row.seo_defaults = payload.seoDefaults
  if (Object.hasOwn(payload, 'siteConfig')) row.site_config = payload.siteConfig
  if (Object.hasOwn(payload, 'adsenseSettings')) {
    row.adsense_settings = payload.adsenseSettings
  }
  if (Object.hasOwn(payload, 'revalidationUrl')) {
    row.revalidation_url = payload.revalidationUrl
  }
  if (payload.clearRevalidationSecret) {
    row.revalidation_secret_encrypted = null
  } else if (payload.revalidationSecret) {
    row.revalidation_secret_encrypted = encryptSecret(payload.revalidationSecret)
  }

  return row
}

export async function getSettings(websiteId) {
  const rows = await supabaseAdminRequest(
    `cms_site_settings?select=${SETTINGS_SELECT}&website_id=eq.${encodeURIComponent(websiteId)}&limit=1`
  )

  return serializeSettings(rows?.[0])
}

export async function getRawSettings(websiteId) {
  const rows = await supabaseAdminRequest(
    `cms_site_settings?select=${SETTINGS_SELECT}&website_id=eq.${encodeURIComponent(websiteId)}&limit=1`
  )

  return rows?.[0] || null
}

export async function upsertDefaultSettings(websiteId) {
  const rows = await supabaseAdminRequest('cms_site_settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: {
      website_id: websiteId,
    },
  })

  return serializeSettings(rows?.[0])
}

export async function updateSettings(websiteId, payload) {
  const rows = await supabaseAdminRequest(
    `cms_site_settings?website_id=eq.${encodeURIComponent(websiteId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: toDatabasePayload(payload),
    }
  )

  return serializeSettings(rows?.[0])
}
