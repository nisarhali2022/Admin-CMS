import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { test } from 'node:test'

import { getContentQualityWarnings } from 'cms-core/cms/contentQuality'

test('content quality checks are warnings and recognize Home date placeholders', () => {
  const warnings = getContentQualityWarnings({
    entityType: 'home',
    contentHtml: '<h1>Today Telenor Answer 16 July 2026</h1><p><img src="/quiz.png"></p>',
    seoTitle: 'Short',
    metaDescription: 'Short',
    focusKeyphrase: '',
    featuredImage: { altText: '' },
  })
  const ids = warnings.map((warning) => warning.id)

  assert.ok(ids.includes('home-literal-date'))
  assert.ok(ids.includes('body-h1'))
  assert.ok(ids.includes('missing-inline-image-alt'))
  assert.ok(ids.includes('missing-featured-image-alt'))
  assert.ok(ids.includes('missing-focus-keyphrase'))
  assert.ok(ids.includes('short-seo-title'))
  assert.ok(ids.includes('short-meta-description'))

  const resolvedHome = getContentQualityWarnings({
    entityType: 'home',
    contentHtml: '<h1>Today Telenor Answer {date}</h1><h2>Quiz</h2>',
    seoTitle: 'Telenor Quiz Today Answers',
    metaDescription: 'Get the latest daily My Telenor quiz answers and practical instructions for taking part.',
    focusKeyphrase: 'Telenor quiz today',
    featuredImage: { altText: 'Telenor quiz screen' },
  })

  assert.equal(resolvedHome.some((warning) => warning.id === 'home-literal-date'), false)

  const partiallyResolvedHome = getContentQualityWarnings({
    entityType: 'home',
    contentHtml: '<h1>Today Telenor Answer {date}</h1><h2>Today Telenor Answer 16 July 2026</h2>',
    seoTitle: 'Telenor Quiz Today Answers',
    metaDescription: 'Get the latest daily My Telenor quiz answers and practical instructions for taking part.',
    focusKeyphrase: 'Telenor quiz today',
    featuredImage: { altText: 'Telenor quiz screen' },
  })

  assert.ok(partiallyResolvedHome.some((warning) => warning.id === 'home-literal-date'))
})

test('visible Home date migration replaces only the H1 and daily quiz H2 dates', async () => {
  const migrationDir = 'setup-provisioning/supabase/migrations'
  const migrationName = (await readdir(migrationDir)).find((file) => file.includes('home_visible_date_tokens'))
  assert.ok(migrationName)
  const sql = await readFile(`${migrationDir}/${migrationName}`, 'utf8')

  assert.ok(sql.includes('<h1[^>]*>[^<]*'))
  assert.ok(sql.includes('<h2[^>]*>Today[[:space:]]+Telenor[[:space:]]+Answer'))
  assert.match(sql, /E'\\\\1\{date\}'/)
  assert.match(sql, /test\.telenorquiztoday\.com\.pk/)
  assert.doesNotMatch(sql, /update public\.cms_posts/)
})

test('local SEO migration provides exact anon redirect lookup and canonical sitemap repairs', async () => {
  const migrationDir = 'setup-provisioning/supabase/migrations'
  const migrationName = (await readdir(migrationDir)).find((file) => file.includes('local_seo_quality'))
  assert.ok(migrationName)
  const sql = await readFile(`${migrationDir}/${migrationName}`, 'utf8')

  assert.match(sql, /create or replace function public\.get_public_redirect\(domain text, from_path text\)/)
  assert.match(sql, /security definer/)
  assert.match(sql, /set search_path = public, pg_temp/)
  assert.match(sql, /grant execute on function public\.get_public_redirect\(text, text\) to anon/)
  assert.match(sql, /cms_redirects_public_lookup_idx/)
  assert.match(sql, /'\/about-us'/)
  assert.match(sql, /'\/contact-us'/)
  assert.match(sql, /'\/privacy-policy'/)
  assert.match(sql, /'\/telenor-quiz-today'/)
  assert.match(sql, /'\/404-page'/)
  assert.match(sql, /'\/disclaimer'/)
  assert.match(sql, /'\/terms-of-service'/)
  assert.match(sql, /set featured_image_id = home_images\.og_image_id/)
  assert.doesNotMatch(sql, /page\.og_image_id/)
  assert.match(sql, /'\{heroText\}'/)
  assert.match(sql, /test\.telenorquiztoday\.com\.pk/)
  assert.match(sql, /E'\\\\1\{date\}'/)
})

test('post and page editors show non-blocking content quality checks', async () => {
  const [posts, pages, panel] = await Promise.all([
    readFile('features/posts/PostsManager.jsx', 'utf8'),
    readFile('features/template-content/TemplateContentManager.jsx', 'utf8'),
    readFile('components/admin/ContentQualityPanel.jsx', 'utf8'),
  ])

  assert.match(posts, /<ContentQualityPanel/)
  assert.match(pages, /<ContentQualityPanel/)
  assert.match(panel, /never prevent saving/i)
})
