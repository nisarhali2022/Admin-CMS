export const DEFAULT_ADSENSE_SETTINGS = {
  enabled: false,
  publisherId: null,
  autoAdsEnabled: true,
  adsTxt: null,
}

export function getSafeAdsenseSettings(settings = {}) {
  const publisherId =
    typeof settings.publisherId === 'string' && settings.publisherId.trim()
      ? settings.publisherId.trim()
      : null
  const enabled = Boolean(settings.enabled && publisherId?.startsWith('ca-pub-'))

  return {
    enabled,
    publisherId: enabled ? publisherId : null,
    autoAdsEnabled:
      typeof settings.autoAdsEnabled === 'boolean' ? settings.autoAdsEnabled : true,
    adsTxt: enabled ? settings.adsTxt || null : null,
  }
}

export function serializeSettings(row) {
  if (!row) return null

  const adsenseSettings = {
    ...DEFAULT_ADSENSE_SETTINGS,
    ...(row.adsenseSettings || row.adsense_settings || {}),
  }

  return {
    id: row.id,
    websiteId: row.websiteId || row.website_id,
    robotsTxt: row.robotsTxt ?? row.robots_txt ?? null,
    sitemapSettings: row.sitemapSettings || row.sitemap_settings || {},
    seoDefaults: row.seoDefaults || row.seo_defaults || {},
    siteConfig: row.siteConfig || row.site_config || {},
    adsenseSettings,
    safeAdsenseSettings: getSafeAdsenseSettings(adsenseSettings),
    revalidationUrl: row.revalidationUrl ?? row.revalidation_url ?? null,
    hasRevalidationSecret: Boolean(
      row.revalidationSecretEncrypted || row.revalidation_secret_encrypted
    ),
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
  }
}
