import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { test } from 'node:test'

const migrationDir = 'supabase/migrations'

async function readMigration(namePart) {
  const files = await readdir(migrationDir)
  const file = files.find((candidate) => candidate.includes(namePart))

  assert.ok(file, `Expected migration containing ${namePart}`)

  return readFile(`${migrationDir}/${file}`, 'utf8')
}

test('rls migration enables RLS and closes direct anon table access', async () => {
  const sql = await readMigration('rls_public_rpcs')

  for (const table of [
    'cms_websites',
    'cms_website_domains',
    'cms_template_content',
    'cms_categories',
    'cms_authors',
    'cms_posts',
    'cms_media',
    'cms_redirects',
    'cms_import_jobs',
    'cms_site_settings',
  ]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`))
  }

  assert.match(sql, /revoke all privileges on table/)
  assert.match(sql, /from anon, authenticated/)
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete)\s+on\s+table[\s\S]+to\s+anon/i)
})

test('rls migration exposes only documented public RPCs to anon', async () => {
  const sql = await readMigration('rls_public_rpcs')

  for (const fn of [
    'get_public_site_by_domain',
    'get_public_template_content',
    'get_public_post',
    'list_public_posts',
    'list_public_categories',
    'list_public_authors',
    'get_public_site_settings',
    'list_public_redirects',
  ]) {
    assert.match(sql, new RegExp(`create or replace function public\\.${fn}\\b`))
    assert.match(sql, new RegExp(`grant execute on function public\\.${fn}`))
  }

  assert.match(sql, /security definer/)
  assert.match(sql, /set search_path = public, pg_temp/)
  assert.match(sql, /revoke all on function public\.cms_public_website_id\(text\) from PUBLIC, anon, authenticated/)
  assert.doesNotMatch(sql, /grant execute on function public\.cms_import_jobs/i)
})

test('public RPC SQL enforces public-safe visibility by resource type', async () => {
  const sql = await readMigration('rls_public_rpcs')

  assert.match(sql, /w\.is_active = true/)
  assert.match(sql, /t\.status = 'published'/)
  assert.match(sql, /p\.status = 'published'/)
  assert.match(sql, /a\.is_active = true/)
  assert.match(sql, /r\.is_active = true/)
  assert.match(sql, /deleted_at is null/)
  assert.doesNotMatch(sql, /revalidation_secret_encrypted/)
  assert.doesNotMatch(sql, /temporary_credentials_encrypted/)
})

test('public RPC SQL resolves media and sanitizes AdSense settings', async () => {
  const sql = await readMigration('rls_public_rpcs')

  assert.match(sql, /cms_public_image_object/)
  assert.match(sql, /cms_resolve_media_references/)
  assert.match(sql, /'url', m\.public_url/)
  assert.match(sql, /'alt', coalesce\(m\.alt_text, ''\)/)
  assert.match(sql, /'caption', m\.caption/)
  assert.match(sql, /'width', m\.width/)
  assert.match(sql, /'height', m\.height/)
  assert.match(sql, /\^ca-pub-\[0-9\]\+\$/)
  assert.match(sql, /'enabled', false/)
  assert.match(sql, /'publisherId', null/)
  assert.match(sql, /'adsTxt', null/)
})
