import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { test } from 'node:test'

const migrationDir = 'setup-provisioning/supabase/migrations'

async function readMigration(namePart) {
  const files = await readdir(migrationDir)
  const file = files.find((candidate) => candidate.includes(namePart))

  assert.ok(file, `Expected migration containing ${namePart}`)

  return readFile(`${migrationDir}/${file}`, 'utf8')
}

test('cms schema migration creates all v1 tables and excludes removed tables', async () => {
  const sql = await readMigration('cms_schema')

  for (const table of [
    'cms_websites',
    'cms_website_domains',
    'cms_template_content',
    'cms_categories',
    'cms_media',
    'cms_authors',
    'cms_posts',
    'cms_redirects',
    'cms_import_jobs',
    'cms_site_settings',
  ]) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\b`))
  }

  const customPagesSql = await readMigration('custom_pages')
  assert.match(customPagesSql, /create table if not exists public\.cms_pages/)
  assert.match(customPagesSql, /create unique index if not exists cms_pages_website_path_active_key/)
  const postBodyHtmlSql = await readMigration('post_body_html')
  assert.match(postBodyHtmlSql, /alter table public\.cms_posts/)
  assert.match(postBodyHtmlSql, /add column if not exists body_html text/)

  for (const removedTable of [
    'cms_tags',
    'cms_post_tags',
    'cms_audit_events',
  ]) {
    assert.doesNotMatch(sql, new RegExp(`create table public\\.${removedTable}\\b`))
  }
})

test('cms schema migration captures key milestone 2 constraints', async () => {
  const sql = await readMigration('cms_schema')

  assert.match(sql, /author_id uuid not null/)
  assert.match(sql, /focus_keyphrase text/)
  assert.match(sql, /create unique index cms_media_storage_path_key/)
  assert.match(sql, /create index cms_import_jobs_website_status_idx/)
  assert.match(sql, /foreign key \(author_id, website_id\)/)
  assert.match(sql, /cms_template_content_author_same_website_fk/)
  assert.match(sql, /create index cms_template_content_website_author_idx/)
  assert.match(sql, /foreign key \(avatar_image_id, website_id\)/)
  assert.match(sql, /adsense_settings jsonb not null default/)
  assert.match(sql, /status in \('draft', 'published', 'unpublished'\)/)
  assert.match(sql, /redirect_type in \(301, 302\)/)
})

test('cms media bucket migration creates the public Supabase Storage bucket', async () => {
  const sql = await readMigration('cms_media_bucket')

  assert.match(sql, /insert into storage\.buckets/)
  assert.match(sql, /'cms-media'/)
  assert.match(sql, /true/)
  assert.match(sql, /image\/webp/)
})
