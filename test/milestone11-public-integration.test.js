import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { afterEach, test } from 'node:test'

import {
  createPublicCmsClient,
  getAdsTxtContent,
  getAdsenseScriptSrc,
  getPublicContentUrls,
  normalizeRevalidationPayload,
  shouldRenderAdsense,
  verifyRevalidationSecret,
} from 'cms-core/public-cms/index'

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
})

test('public CMS client calls documented Supabase RPCs with anon credentials', async () => {
  const calls = []
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })
    return Response.json({ ok: true })
  }

  const client = createPublicCmsClient({
    supabaseUrl: 'https://project.supabase.co/',
    supabaseAnonKey: 'anon-key',
  })

  await client.getSiteByDomain('https://Example.com/path')
  await client.getTemplateContent('example.com', 'home')
  await client.getPage('example.com', '/about-us')
  await client.getPost('example.com', 'hello')
  await client.listPosts('example.com', { categorySlug: 'news', search: 'sim' })
  await client.listPostsPage('example.com', { categorySlug: 'news', authorSlug: 'editor' })
  await client.listCategories('example.com')
  await client.listAuthors('example.com')
  await client.getAuthor('example.com', 'editor')
  await client.getSiteSettings('example.com')
  await client.listRedirects('example.com')
  await client.getRedirect('example.com', '/old-path')
  await client.listContentIndex('example.com')
  await client.getCurrentQuiz()

  assert.ok(calls.every((call) => call.options.method === 'POST'))
  assert.ok(calls.every((call) => call.options.headers.Authorization === 'Bearer anon-key'))
  assert.ok(calls.every((call) => !call.options.headers.Authorization.includes('service')))
  assert.ok(calls.some((call) => call.url.endsWith('/rpc/get_public_site_by_domain')))
  assert.ok(calls.some((call) => call.url.endsWith('/rpc/get_public_page')))
  assert.ok(calls.some((call) => call.url.endsWith('/rpc/list_public_redirects')))
  assert.ok(calls.some((call) => call.url.endsWith('/rpc/get_public_redirect')))
  assert.ok(calls.some((call) => call.url.endsWith('/rpc/list_public_posts_page')))
  assert.ok(calls.some((call) => call.url.endsWith('/rpc/get_public_author')))
  assert.ok(calls.some((call) => call.url.endsWith('/rpc/list_public_content_index')))
  assert.ok(calls.some((call) => call.url.endsWith('/rpc/cms_public_get_current_quiz')))
  assert.deepEqual(JSON.parse(calls[0].options.body), { domain: 'example.com' })
})

test('public post-list RPC provides reading time without exposing post bodies', async () => {
  const migrationDir = 'setup-provisioning/supabase/migrations'
  const migrationName = (await readdir(migrationDir))
    .find((file) => file.includes('public_post_reading_time'))
  assert.ok(migrationName)

  const sql = await readFile(`${migrationDir}/${migrationName}`, 'utf8')
  assert.match(sql, /create or replace function public\.list_public_posts_page/)
  assert.match(sql, /'readingTimeMinutes'/)
  assert.match(sql, /regexp_split_to_array/)
  assert.match(sql, /coalesce\(p\.body_html, ''\)/)
  assert.match(sql, /grant execute on function public\.list_public_posts_page\(text, text, text, text, integer, integer\) to anon/)
})

test('AdSense helpers render only active valid public settings and gate ads.txt', () => {
  const inactive = {
    adsense: {
      enabled: false,
      publisherId: 'ca-pub-123',
      autoAdsEnabled: true,
      adsTxt: 'google.com, pub-123, DIRECT',
    },
  }
  const active = {
    adsense: {
      enabled: true,
      publisherId: 'ca-pub-123',
      autoAdsEnabled: true,
      adsTxt: 'google.com, pub-123, DIRECT',
    },
  }

  assert.equal(shouldRenderAdsense(inactive), false)
  assert.equal(getAdsenseScriptSrc(inactive), null)
  assert.equal(getAdsTxtContent(inactive), null)
  assert.equal(shouldRenderAdsense(active), true)
  assert.match(getAdsenseScriptSrc(active), /client=ca-pub-123/)
  assert.equal(getAdsTxtContent(active), 'google.com, pub-123, DIRECT')
})

test('revalidation helper verifies secret and normalizes payload', () => {
  const request = {
    headers: new Headers({ 'x-cms-revalidation-secret': 'secret' }),
  }

  assert.equal(verifyRevalidationSecret(request, 'secret'), true)
  assert.equal(verifyRevalidationSecret(request, 'wrong'), false)
  assert.deepEqual(
    normalizeRevalidationPayload({
      websiteId: 'site-id',
      event: 'post.published',
      paths: ['/', '', '/blog'],
      resourceType: 'post',
      resourceId: 'post-id',
    }),
    {
      websiteId: 'site-id',
      event: 'post.published',
      paths: ['/', '/blog'],
      resourceType: 'post',
      resourceId: 'post-id',
    }
  )
})

test('sitemap helper returns published template and post URLs without duplicates', () => {
  assert.deepEqual(
    getPublicContentUrls({
      domain: 'https://example.com/',
      templates: [
        { path: '/', sitemapInclude: true },
        { path: '/about', sitemapInclude: true },
        { path: '/draft', sitemapInclude: false },
      ],
      pages: [
        { path: '/about-us', sitemapInclude: true },
        { path: '/hidden-page', sitemapInclude: false },
      ],
      posts: [
        { slug: 'hello', category: { slug: 'news' }, sitemapInclude: true },
        { slug: 'hidden', category: { slug: 'news' }, sitemapInclude: false },
        { slug: 'hello', categorySlug: 'news', sitemapInclude: true },
        { slug: 'missing-category', sitemapInclude: true },
      ],
    }),
    [
      'https://example.com',
      'https://example.com/about',
      'https://example.com/about-us',
      'https://example.com/news/hello',
    ]
  )
})
