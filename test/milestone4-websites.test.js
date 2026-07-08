import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { afterEach, test } from 'node:test'

import {
  normalizeDomain,
  validateCreateWebsitePayload,
  validateUpdateWebsitePayload,
} from 'cms-core/cms/validators/websites'
import {
  createWebsite,
  listWebsites,
  updateWebsite,
} from 'cms-core/cms/repositories/websites'

const migrationDir = 'setup-provisioning/supabase/migrations'
const originalFetch = global.fetch
const originalEnv = { ...process.env }

async function readMigration(namePart) {
  const files = await readdir(migrationDir)
  const file = files.find((candidate) => candidate.includes(namePart))

  assert.ok(file, `Expected migration containing ${namePart}`)

  return readFile(`${migrationDir}/${file}`, 'utf8')
}

afterEach(() => {
  global.fetch = originalFetch
  process.env = { ...originalEnv }
})

function setValidEnv() {
  process.env.ADMIN_SECRET = 'test-admin-secret'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  process.env.CMS_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64')
}

test('website validators normalize domains and reject invalid payloads', () => {
  assert.equal(normalizeDomain('https://Example.COM/path'), 'example.com')
  assert.deepEqual(validateCreateWebsitePayload({
    name: ' Example Site ',
    primaryDomain: 'HTTPS://Example.com/blog',
  }), {
    name: 'Example Site',
    primaryDomain: 'example.com',
  })
  assert.deepEqual(validateUpdateWebsitePayload({
    isActive: false,
  }), {
    isActive: false,
  })
  assert.throws(
    () => validateCreateWebsitePayload({ name: 'Site', primaryDomain: 'localhost' }),
    /Valid primary domain/
  )
})

test('website management migration adds transactional admin website functions', async () => {
  const sql = await readMigration('admin_website_management')

  assert.match(sql, /create or replace function public\.cms_admin_create_website/)
  assert.match(sql, /insert into public\.cms_websites/)
  assert.match(sql, /insert into public\.cms_website_domains/)
  assert.match(sql, /insert into public\.cms_site_settings/)
  assert.match(sql, /is_active[\s\S]+false/)
  assert.match(sql, /create or replace function public\.cms_admin_update_website/)
  assert.match(sql, /create or replace function public\.cms_admin_deactivate_website/)
  assert.match(sql, /grant execute on function public\.cms_admin_create_website\(text, text\) to service_role/)
  assert.doesNotMatch(sql, /grant execute[\s\S]+to anon/)
})

test('website repository uses server-only Supabase service-role requests', async () => {
  setValidEnv()
  const calls = []

  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })

    if (String(url).includes('/rpc/cms_admin_create_website')) {
      return Response.json({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Example Site',
        slug: 'example-site',
        primaryDomain: 'example.com',
        isActive: false,
        createdAt: '2026-07-03T00:00:00.000Z',
        updatedAt: '2026-07-03T00:00:00.000Z',
      })
    }

    if (String(url).includes('/rpc/cms_admin_update_website')) {
      return Response.json({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Example Site',
        slug: 'example-site',
        primaryDomain: 'example.com',
        isActive: true,
        createdAt: '2026-07-03T00:00:00.000Z',
        updatedAt: '2026-07-03T00:00:00.000Z',
      })
    }

    return Response.json([
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Example Site',
        slug: 'example-site',
        primary_domain: 'example.com',
        is_active: false,
        created_at: '2026-07-03T00:00:00.000Z',
        updated_at: '2026-07-03T00:00:00.000Z',
      },
    ])
  }

  const websites = await listWebsites()
  const created = await createWebsite({
    name: 'Example Site',
    primaryDomain: 'example.com',
  })
  const updated = await updateWebsite(created.id, { isActive: true })

  assert.equal(websites[0].primaryDomain, 'example.com')
  assert.equal(created.isActive, false)
  assert.equal(updated.isActive, true)
  assert.ok(calls.every((call) => call.options.headers.apikey === 'service-role-key'))
  assert.ok(calls.every((call) => call.options.headers.Authorization === 'Bearer service-role-key'))
  assert.match(calls[1].url, /\/rest\/v1\/rpc\/cms_admin_create_website$/)
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    input_name: 'Example Site',
    input_primary_domain: 'example.com',
  })
})
