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

test('admin service-role migration grants CMS table access without opening anon', async () => {
  const sql = await readMigration('admin_service_role_grants')

  assert.match(sql, /grant usage on schema public to service_role/)
  assert.match(sql, /grant select, insert, update, delete on table/)
  assert.match(sql, /public\.cms_websites/)
  assert.match(sql, /public\.cms_media/)
  assert.match(sql, /public\.cms_authors/)
  assert.match(sql, /public\.cms_categories/)
  assert.match(sql, /to service_role/)
  assert.doesNotMatch(sql, /to anon/)
  assert.doesNotMatch(sql, /to authenticated/)
})
