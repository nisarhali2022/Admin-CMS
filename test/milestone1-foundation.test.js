import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  clearAdminLoginFailures,
  getAdminLoginLimitStatus,
  recordFailedAdminLogin,
  resetAdminLoginRateLimitForTests,
} from '../lib/auth/adminLoginRateLimit.js'
import { validateAdminEnv } from '../lib/env/adminEnv.js'

const validEnv = {
  ADMIN_SECRET: 'test-admin-secret',
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  CMS_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
}

test('admin env validation accepts required values', () => {
  const env = validateAdminEnv(validEnv)

  assert.equal(env.adminSecret, validEnv.ADMIN_SECRET)
  assert.equal(env.supabaseUrl, validEnv.NEXT_PUBLIC_SUPABASE_URL)
  assert.equal(env.supabaseServiceRoleKey, validEnv.SUPABASE_SERVICE_ROLE_KEY)
  assert.equal(env.cmsEncryptionKey, validEnv.CMS_ENCRYPTION_KEY)
})

test('admin env validation rejects missing values and invalid encryption key', () => {
  assert.throws(
    () =>
      validateAdminEnv({
        ...validEnv,
        ADMIN_SECRET: '',
        CMS_ENCRYPTION_KEY: Buffer.alloc(12, 1).toString('base64'),
      }),
    /ADMIN_SECRET.*CMS_ENCRYPTION_KEY/
  )
})

test('admin login rate limit locks after repeated failures and clears after success', () => {
  resetAdminLoginRateLimitForTests()

  const identifier = '127.0.0.1'
  const now = 1000

  assert.equal(getAdminLoginLimitStatus(identifier, now).allowed, true)

  for (let attempt = 0; attempt < 4; attempt += 1) {
    assert.equal(recordFailedAdminLogin(identifier, now).allowed, true)
  }

  const locked = recordFailedAdminLogin(identifier, now)
  assert.equal(locked.allowed, false)
  assert.equal(locked.retryAfterSeconds, 600)

  clearAdminLoginFailures(identifier)
  assert.equal(getAdminLoginLimitStatus(identifier, now).allowed, true)
})
