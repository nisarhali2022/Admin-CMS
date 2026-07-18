import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

test('public post pagination keeps published posts newest first', async () => {
  const migration = await readFile(
    'setup-provisioning/supabase/migrations/202607140002_public_frontend_rpcs.sql',
    'utf8'
  )

  assert.match(
    migration,
    /order by p\.published_at desc nulls last, p\.created_at desc/
  )
})
