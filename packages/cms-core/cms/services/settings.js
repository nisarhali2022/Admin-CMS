import { getSettings, updateSettings, upsertDefaultSettings } from '../repositories/settings.js'
import { triggerRevalidation } from './revalidation.js'

export async function getSettingsForWebsite(websiteId) {
  const existing = await getSettings(websiteId)
  if (existing) return existing

  return upsertDefaultSettings(websiteId)
}

export async function updateSettingsForWebsite(websiteId, payload) {
  let result = await updateSettings(websiteId, payload)
  if (!result) {
    await upsertDefaultSettings(websiteId)
    result = await updateSettings(websiteId, payload)
  }

  const revalidation = await triggerRevalidation({
    websiteId,
    event: 'settings.updated',
    resourceType: 'settings',
    resourceId: result?.id,
    paths: ['/', '/robots.txt', '/sitemap.xml', '/ads.txt'],
  })

  return { result, revalidation }
}
