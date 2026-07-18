import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

test('post and page editors save index,follow by default and explain canonical overrides', async () => {
  const [posts, pages] = await Promise.all([
    readFile('features/posts/PostsManager.jsx', 'utf8'),
    readFile('features/template-content/TemplateContentManager.jsx', 'utf8'),
  ])

  for (const source of [posts, pages]) {
    assert.match(source, /robotsMeta: 'index,follow'/)
    assert.match(source, /robotsMeta: form\.robotsMeta \|\| 'index,follow'/)
    assert.match(source, /Canonical URL override \(optional\)/)
    assert.doesNotMatch(source, /Default robots/)
  }

  assert.match(pages, /canonicalUrl: form\.canonicalUrl \|\| null/)
  assert.doesNotMatch(pages, /Automatic canonical path/)
  assert.doesNotMatch(pages, /No canonical value is stored automatically/)
})

test('robots default migration updates only empty values across all CMS content types', async () => {
  const sql = await readFile(
    'setup-provisioning/supabase/migrations/202607170002_default_index_follow_robots.sql',
    'utf8'
  )

  for (const table of ['cms_posts', 'cms_pages', 'cms_template_content']) {
    assert.match(sql, new RegExp(`update public\\.${table}`))
  }
  assert.match(sql, /set robots_meta = 'index,follow'/)
  assert.match(sql, /where robots_meta is null or btrim\(robots_meta\) = ''/)
  assert.match(sql, /path !~ '\^\/\(api\|admin\|author\|blog\|search\|tag\)\(\/\|\$\)'/)
  assert.doesNotMatch(sql, /set canonical_url/i)
})
