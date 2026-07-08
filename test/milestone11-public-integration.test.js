import assert from 'node:assert/strict'
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
  await client.listCategories('example.com')
  await client.listAuthors('example.com')
  await client.getSiteSettings('example.com')
  await client.listRedirects('example.com')
  await client.getCurrentQuiz()

  assert.ok(calls.every((call) => call.options.method === 'POST'))
  assert.ok(calls.every((call) => call.options.headers.Authorization === 'Bearer anon-key'))
  assert.ok(calls.every((call) => !call.options.headers.Authorization.includes('service')))
  assert.ok(calls.some((call) => call.url.endsWith('/rpc/get_public_site_by_domain')))
  assert.ok(calls.some((call) => call.url.endsWith('/rpc/get_public_page')))
  assert.ok(calls.some((call) => call.url.endsWith('/rpc/list_public_redirects')))
  assert.ok(calls.some((call) => call.url.endsWith('/rpc/cms_public_get_current_quiz')))
  assert.deepEqual(JSON.parse(calls[0].options.body), { domain: 'example.com' })
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
        { slug: 'hello', sitemapInclude: true },
        { slug: 'hidden', sitemapInclude: false },
        { slug: 'hello', sitemapInclude: true },
      ],
    }),
    [
      'https://example.com',
      'https://example.com/about',
      'https://example.com/about-us',
      'https://example.com/blog/hello',
    ]
  )
})
