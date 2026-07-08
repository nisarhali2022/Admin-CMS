import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import { decryptSecret, encryptSecret } from 'cms-core/cms/crypto/secrets'
import { createRedirectForWebsite } from 'cms-core/cms/services/redirects'
import { updateSettingsForWebsite } from 'cms-core/cms/services/settings'
import { triggerRevalidation } from 'cms-core/cms/services/revalidation'
import {
  validateRedirectPayload,
  validateRedirectPatchPayload,
} from 'cms-core/cms/validators/redirects'
import {
  validateAdsenseSettings,
  validateSettingsPatchPayload,
} from 'cms-core/cms/validators/settings'

const originalFetch = global.fetch
const originalEnv = { ...process.env }

const websiteId = '11111111-1111-4111-8111-111111111111'
const redirectId = '22222222-2222-4222-8222-222222222222'

function setValidEnv() {
  process.env.ADMIN_SECRET = 'test-admin-secret'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  process.env.CMS_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64')
}

function settingsRow(overrides = {}) {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    website_id: websiteId,
    robots_txt: 'User-agent: *\nAllow: /',
    sitemap_settings: {},
    seo_defaults: {},
    site_config: {},
    adsense_settings: {
      enabled: false,
      publisherId: null,
      autoAdsEnabled: true,
      adsTxt: null,
    },
    revalidation_url: null,
    revalidation_secret_encrypted: null,
    created_at: '2026-07-04T00:00:00.000Z',
    updated_at: '2026-07-04T00:00:00.000Z',
    ...overrides,
  }
}

afterEach(() => {
  global.fetch = originalFetch
  process.env = { ...originalEnv }
})

test('redirect validator rejects loops and accepts 301/302 payloads', () => {
  assert.deepEqual(
    validateRedirectPayload({
      fromPath: '/old',
      toUrl: '/new',
      redirectType: 302,
      isActive: false,
    }),
    {
      fromPath: '/old',
      toUrl: '/new',
      redirectType: 302,
      isActive: false,
    }
  )

  assert.deepEqual(
    validateRedirectPayload({
      fromPath: 'https://example.com/old-path?from=wp',
      toUrl: '/new',
      redirectType: 301,
    }),
    {
      fromPath: '/old-path?from=wp',
      toUrl: '/new',
      redirectType: 301,
      isActive: true,
    }
  )

  assert.throws(
    () => validateRedirectPayload({ fromPath: '/same', toUrl: '/same' }),
    /cannot match/
  )
  assert.throws(
    () => validateRedirectPayload({ fromPath: 'old-path', toUrl: '/new' }),
    /relative path/
  )
  assert.throws(
    () => validateRedirectPatchPayload({ redirectType: 307 }),
    /301 or 302/
  )
})

test('redirect service normalizes duplicate source path errors', async () => {
  setValidEnv()
  global.fetch = async () =>
    Response.json(
      { code: '23505', message: 'duplicate key value violates unique constraint' },
      { status: 409 }
    )

  await assert.rejects(
    () =>
      createRedirectForWebsite(
        websiteId,
        validateRedirectPayload({
          fromPath: '/old',
          toUrl: '/new',
          redirectType: 301,
        })
      ),
    /already exists/
  )
})

test('settings validator enforces AdSense publisher ID and JSON objects', () => {
  assert.deepEqual(
    validateAdsenseSettings({
      enabled: false,
      publisherId: 'ca-pub-123',
      autoAdsEnabled: false,
      adsTxt: 'google.com, pub-123, DIRECT',
    }),
    {
      enabled: false,
      publisherId: 'ca-pub-123',
      autoAdsEnabled: false,
      adsTxt: 'google.com, pub-123, DIRECT',
    }
  )

  assert.throws(
    () => validateAdsenseSettings({ enabled: true, publisherId: 'pub-123' }),
    /ca-pub-/
  )
  assert.throws(
    () => validateSettingsPatchPayload({ sitemapSettings: [] }),
    /must be an object/
  )
})

test('settings update encrypts revalidation secret and webhook receives decrypted header', async () => {
  setValidEnv()
  const calls = []
  let encryptedSecret = null

  global.fetch = async (url, options = {}) => {
    const stringUrl = String(url)
    calls.push({ url: stringUrl, options })

    if (stringUrl === 'https://site.example/api/revalidate') {
      return Response.json({ ok: true })
    }

    if (
      stringUrl.includes('/rest/v1/cms_site_settings') &&
      options.method === 'PATCH'
    ) {
      const body = JSON.parse(options.body)
      encryptedSecret = body.revalidation_secret_encrypted
      return Response.json([
        settingsRow({
          robots_txt: body.robots_txt,
          adsense_settings: body.adsense_settings,
          revalidation_url: body.revalidation_url,
          revalidation_secret_encrypted: body.revalidation_secret_encrypted,
        }),
      ])
    }

    if (stringUrl.includes('/rest/v1/cms_site_settings')) {
      return Response.json([
        settingsRow({
          revalidation_url: 'https://site.example/api/revalidate',
          revalidation_secret_encrypted: encryptedSecret,
        }),
      ])
    }

    return Response.json([])
  }

  const { result, revalidation } = await updateSettingsForWebsite(
    websiteId,
    validateSettingsPatchPayload({
      robotsTxt: 'User-agent: *\nAllow: /',
      adsenseSettings: {
        enabled: true,
        publisherId: 'ca-pub-123456',
        autoAdsEnabled: true,
        adsTxt: 'google.com, pub-123456, DIRECT',
      },
      revalidationUrl: 'https://site.example/api/revalidate',
      revalidationSecret: 'super-secret',
    })
  )
  const webhookCall = calls.find((call) => call.url === 'https://site.example/api/revalidate')

  assert.equal(result.hasRevalidationSecret, true)
  assert.notEqual(encryptedSecret, 'super-secret')
  assert.equal(decryptSecret(encryptedSecret), 'super-secret')
  assert.equal(webhookCall.options.headers['x-cms-revalidation-secret'], 'super-secret')
  assert.equal(revalidation.ok, true)
})

test('revalidation webhook failure is returned without throwing', async () => {
  setValidEnv()
  const encryptedSecret = encryptSecret('secret')

  global.fetch = async (url) => {
    const stringUrl = String(url)

    if (stringUrl.includes('/rest/v1/cms_site_settings')) {
      return Response.json([
        settingsRow({
          revalidation_url: 'https://site.example/api/revalidate',
          revalidation_secret_encrypted: encryptedSecret,
        }),
      ])
    }

    throw new Error('network down')
  }

  const result = await triggerRevalidation({
    websiteId,
    event: 'settings.updated',
    resourceType: 'settings',
    resourceId: redirectId,
  })

  assert.equal(result.attempted, true)
  assert.equal(result.ok, false)
  assert.match(result.error, /network down/)
})
