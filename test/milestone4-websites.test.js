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
  deleteWebsiteDatabaseRecords,
  listWebsites,
  updateWebsite,
} from 'cms-core/cms/repositories/websites'
import { permanentlyDeleteWebsite } from 'cms-core/cms/services/websites'

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

test('website deletion migration removes scoped rows before the website and preserves global quiz', async () => {
  const sql = await readMigration('delete_website')

  assert.match(sql, /create or replace function public\.cms_admin_delete_website\(input_website_id uuid\)/)
  assert.match(sql, /if target_website\.is_active then/)
  assert.match(sql, /delete from public\.cms_posts/)
  assert.match(sql, /delete from public\.cms_pages/)
  assert.match(sql, /delete from public\.cms_template_content/)
  assert.match(sql, /delete from public\.cms_authors/)
  assert.match(sql, /delete from public\.cms_categories/)
  assert.match(sql, /delete from public\.cms_media/)
  assert.match(sql, /delete from public\.cms_redirects/)
  assert.match(sql, /delete from public\.cms_import_jobs/)
  assert.match(sql, /delete from public\.cms_site_settings/)
  assert.match(sql, /delete from public\.cms_website_domains/)
  assert.match(sql, /delete from public\.cms_websites/)
  assert.doesNotMatch(sql, /delete from public\.cms_global_quiz/)
  assert.match(sql, /grant execute on function public\.cms_admin_delete_website\(uuid\) to service_role/)
})

test('website deletion service rejects active websites before storage cleanup', async () => {
  setValidEnv()
  const calls = []

  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })
    return Response.json([{
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Active Site',
      slug: 'active-site',
      primary_domain: 'active.example.com',
      is_active: true,
      created_at: '2026-07-03T00:00:00.000Z',
      updated_at: '2026-07-03T00:00:00.000Z',
    }])
  }

  await assert.rejects(
    () => permanentlyDeleteWebsite('11111111-1111-4111-8111-111111111111'),
    /Only inactive websites can be permanently deleted/,
  )
  assert.equal(calls.length, 1)
  assert.ok(calls[0].url.includes('/rest/v1/cms_websites?'))
})

test('website deletion route and workspace expose destructive action only in setup project', async () => {
  const route = await readFile(
    'setup-provisioning/app/api/cms/websites/[id]/route.js',
    'utf8',
  )
  const workspace = await readFile(
    'setup-provisioning/features/websites/WebsiteSectionShell.jsx',
    'utf8',
  )

  assert.match(route, /export async function DELETE/)
  assert.match(route, /permanentlyDeleteWebsite/)
  assert.match(workspace, /method: 'DELETE'/)
  assert.match(workspace, /window\.confirm/)
  assert.match(workspace, /!selectedWebsite\.isActive/)
  assert.match(workspace, /Delete website permanently/)
  const mainRoute = await readFile('app/api/cms/websites/[id]/route.js', 'utf8')
  assert.doesNotMatch(mainRoute, /export async function DELETE/)
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

test('website database delete uses the server-only service-role RPC', async () => {
  setValidEnv()
  const calls = []

  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })
    return Response.json({ deleted: true, websiteId: '11111111-1111-4111-8111-111111111111' })
  }

  await deleteWebsiteDatabaseRecords('11111111-1111-4111-8111-111111111111')

  assert.match(calls[0].url, /\/rest\/v1\/rpc\/cms_admin_delete_website$/)
  assert.equal(calls[0].options.headers.apikey, 'service-role-key')
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    input_website_id: '11111111-1111-4111-8111-111111111111',
  })
})
