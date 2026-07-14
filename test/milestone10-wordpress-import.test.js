import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { afterEach, test } from 'node:test'
import sharp from 'sharp'

import { importWordPressForWebsite, resetWordPressImportForWebsite } from 'cms-core/cms/services/import'
import { validateWordPressImportPayload } from 'cms-core/cms/validators/import'
import { sanitizeImportedContentHtml } from 'cms-core/cms/services/importHtml'
import {
  fetchWordPressCollection,
  normalizeWordPressItem,
  normalizeWordPressUser,
} from 'cms-core/cms/services/wordpress'

const originalFetch = global.fetch
const originalEnv = { ...process.env }

const websiteId = '11111111-1111-4111-8111-111111111111'
const jobId = '22222222-2222-4222-8222-222222222222'
const authorId = '33333333-3333-4333-8333-333333333333'
const postId = '44444444-4444-4444-8444-444444444444'
const mediaId = '55555555-5555-4555-8555-555555555555'
const categoryId = '66666666-6666-4666-8666-666666666666'
const pageId = '77777777-7777-4777-8777-777777777777'
async function createTinyPngBytes() {
  return sharp({
    create: {
      width: 1,
      height: 1,
      channels: 3,
      background: '#ffffff',
    },
  })
    .png()
    .toBuffer()
}

function setValidEnv() {
  process.env.ADMIN_SECRET = 'test-admin-secret'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  process.env.CMS_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64')
}

function websiteRow(overrides = {}) {
  return {
    id: websiteId,
    name: 'Import Site',
    slug: 'import-site',
    primary_domain: 'example.com',
    is_active: false,
    created_at: '2026-07-04T00:00:00.000Z',
    updated_at: '2026-07-04T00:00:00.000Z',
    ...overrides,
  }
}

function jobRow(body = {}, overrides = {}) {
  return {
    id: jobId,
    website_id: body.website_id || websiteId,
    source_type: body.source_type || 'wordpress',
    source_url: body.source_url || 'https://wp.example',
    status: body.status || 'queued',
    started_at: body.started_at || null,
    finished_at: body.finished_at || null,
    temporary_credentials_encrypted: body.temporary_credentials_encrypted || null,
    report: body.report || {},
    error_message: body.error_message || null,
    created_at: '2026-07-04T00:00:00.000Z',
    updated_at: '2026-07-04T00:00:00.000Z',
    ...overrides,
  }
}

function authorRow() {
  return {
    id: authorId,
    website_id: websiteId,
    name: 'Imported Author',
    slug: 'imported-author',
    bio: null,
    avatar_image_id: null,
    is_active: true,
    deleted_at: null,
    created_at: '2026-07-04T00:00:00.000Z',
    updated_at: '2026-07-04T00:00:00.000Z',
  }
}

function categoryRow(body = {}) {
  return {
    id: categoryId,
    website_id: websiteId,
    name: body.name || 'Uncategorized',
    slug: body.slug || 'uncategorized',
    description: body.description || null,
    created_at: '2026-07-04T00:00:00.000Z',
    updated_at: '2026-07-04T00:00:00.000Z',
  }
}

function postRow(body) {
  return {
    id: postId,
    website_id: websiteId,
    category_id: body.category_id,
    author_id: body.author_id,
    title: body.title,
    slug: body.slug,
    featured_image_id: body.featured_image_id,
    body_blocks: body.body_blocks,
    seo_title: body.seo_title,
    meta_description: body.meta_description,
    canonical_url: body.canonical_url,
    robots_meta: body.robots_meta,
    og_image_id: body.og_image_id,
    sitemap_include: body.sitemap_include,
    status: body.status,
    published_at: body.published_at,
    deleted_at: null,
    created_at: '2026-07-04T00:00:00.000Z',
    updated_at: '2026-07-04T00:00:00.000Z',
  }
}

function pageRow(body) {
  return {
    id: pageId,
    website_id: websiteId,
    title: body.title,
    path: body.path,
    body_text: body.body_text,
    focus_keyphrase: body.focus_keyphrase,
    seo_title: body.seo_title,
    meta_description: body.meta_description,
    author_id: body.author_id,
    canonical_url: body.canonical_url,
    robots_meta: body.robots_meta,
    featured_image_id: body.featured_image_id,
    sitemap_include: body.sitemap_include,
    status: body.status,
    published_at: body.published_at,
    deleted_at: null,
    created_at: '2026-07-04T00:00:00.000Z',
    updated_at: '2026-07-04T00:00:00.000Z',
  }
}

afterEach(() => {
  global.fetch = originalFetch
  process.env = { ...originalEnv }
})

test('WordPress import is blocked for active websites', async () => {
  setValidEnv()
  global.fetch = async (url) => {
    if (String(url).includes('/rest/v1/cms_websites')) {
      return Response.json([websiteRow({ is_active: true })])
    }
    return Response.json([])
  }

  await assert.rejects(
    () =>
      importWordPressForWebsite(
        websiteId,
        validateWordPressImportPayload({
          wordpressBaseUrl: 'https://wp.example',
          confirmInactiveImport: true,
        })
      ),
    /inactive websites/
  )
})

test('WordPress REST import retries with rest_route and reports endpoint failures', async () => {
  const wordpress = await readFile('packages/cms-core/cms/services/wordpress.js', 'utf8')

  assert.match(wordpress, /rest_route=\/wp\/v2/)
  assert.match(wordpress, /WordPress REST request failed with status/)
  assert.match(wordpress, /non-JSON data/)
  assert.match(wordpress, /mainContentFailed/)
})

test('WordPress collection fetch accepts empty credentials for public REST endpoints', async () => {
  const requests = []
  global.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options })
    return Response.json([])
  }

  const result = await fetchWordPressCollection('https://wp.example', 'posts', null)

  assert.deepEqual(result, [])
  assert.equal(requests.length, 1)
  assert.equal(requests[0].options.headers.Authorization, undefined)
})

test('WordPress collection fetches all pages using pagination headers', async () => {
  const requests = []
  global.fetch = async (url, options = {}) => {
    const page = Number(new URL(url).searchParams.get('page'))
    requests.push({ url: String(url), options, page })
    const start = (page - 1) * 100
    const end = page === 3 ? 250 : page * 100
    return Response.json(
      Array.from({ length: end - start }, (_, index) => ({ id: start + index + 1 })),
      { headers: { 'X-WP-TotalPages': '3', 'X-WP-Total': '250' } }
    )
  }

  const result = await fetchWordPressCollection('https://wp.example', 'posts', {
    username: 'editor',
    applicationPassword: 'app-password',
  })

  assert.equal(result.length, 250)
  assert.deepEqual(requests.map((request) => request.page), [1, 2, 3])
  assert.ok(requests.every((request) => request.options.headers.Authorization.startsWith('Basic ')))
})

test('WordPress collection stops when a page is shorter without pagination headers', async () => {
  const pages = []
  global.fetch = async (url) => {
    const page = Number(new URL(url).searchParams.get('page'))
    pages.push(page)
    const count = page === 1 ? 100 : 4
    return Response.json(Array.from({ length: count }, (_, index) => ({ id: index })))
  }

  const result = await fetchWordPressCollection('https://wp.example', 'media', null)

  assert.equal(result.length, 104)
  assert.deepEqual(pages, [1, 2])
})

test('WordPress collection paginates the rest_route fallback after standard REST fails', async () => {
  const requests = []
  global.fetch = async (url) => {
    const stringUrl = String(url)
    requests.push(stringUrl)
    if (stringUrl.includes('/wp-json/wp/v2/')) {
      return new Response('Not found', { status: 404 })
    }

    const page = Number(new URL(stringUrl).searchParams.get('page'))
    return Response.json(Array.from({ length: page === 1 ? 100 : 1 }, (_, index) => ({ id: index })))
  }

  const result = await fetchWordPressCollection('https://wp.example', 'pages', null)

  assert.equal(result.length, 101)
  assert.equal(requests.filter((url) => url.includes('/wp-json/wp/v2/')).length, 1)
  assert.equal(requests.filter((url) => url.includes('rest_route=/wp/v2/pages')).length, 2)
})

test('WordPress import relaxes SEO and feature-image requirements', async () => {
  const importer = await readFile('packages/cms-core/cms/services/import.js', 'utf8')

  assert.match(importer, /function importedMetaDescription\(value\)/)
  assert.match(importer, /text\.slice\(0, 300\)/)
  assert.match(importer, /featuredImageId: featuredMedia\?\.id \|\| null/)
  assert.match(importer, /ogImageId: null/)
  assert.match(importer, /authorId: author\.id/)
})

test('WordPress normalization prioritizes Yoast SEO fields and leaves missing metadata empty', () => {
  const normalized = normalizeWordPressItem({
    id: 1,
    slug: 'yoast-page',
    title: { rendered: 'WordPress title' },
    excerpt: { rendered: '<p>WordPress excerpt</p>' },
    content: { rendered: '<p>Body</p>' },
    cms_yoast: {
      focusKeyphrase: 'daily quiz, quiz answers',
      seoTitle: 'Bridge SEO title',
      metaDescription: 'Bridge description',
    },
    yoast_head_json: {
      title: 'Generated Yoast title',
      description: 'Generated Yoast description',
    },
  })

  assert.equal(normalized.focusKeyphrase, 'daily quiz, quiz answers')
  assert.equal(normalized.seoTitle, 'Bridge SEO title')
  assert.equal(normalized.metaDescription, 'Generated Yoast description')
  assert.deepEqual(normalized.seoSources, {
    focusKeyphrase: 'yoast',
    seoTitle: 'yoast',
    metaDescription: 'yoast_head_json',
  })
  assert.equal(normalized.yoastBridgeProvided, true)

  const fallback = normalizeWordPressItem({
    id: 2,
    slug: 'fallback-page',
    title: { rendered: 'Fallback title' },
    excerpt: { rendered: '<p>Fallback excerpt</p>' },
    content: { rendered: '<p>Body</p>' },
  })

  assert.equal(fallback.focusKeyphrase, null)
  assert.equal(fallback.seoTitle, 'Fallback title')
  assert.equal(fallback.metaDescription, null)
  assert.equal(fallback.seoSources.metaDescription, 'missing')
})

test('WordPress user normalization imports a safe truncated bio', () => {
  const normalized = normalizeWordPressUser({
    id: 9,
    name: 'Muhammad Shabbar',
    slug: 'muhammad-shabbar',
    description: '<p>Author &amp; editor</p>',
  })

  assert.equal(normalized.name, 'Muhammad Shabbar')
  assert.equal(normalized.slug, 'muhammad-shabbar')
  assert.equal(normalized.bio, 'Author & editor')

  const longBio = normalizeWordPressUser({
    id: 10,
    name: 'Long Bio',
    description: 'x'.repeat(2100),
  })
  assert.equal(longBio.bio.length, 2000)
  assert.equal(normalizeWordPressUser({ id: 11, name: 'No Bio' }).bio, null)
})

test('Yoast REST bridge exposes the importer fields', async () => {
  const bridge = await readFile(
    'setup-provisioning/wordpress/cms-yoast-rest-bridge.php',
    'utf8'
  )

  assert.match(bridge, /register_rest_field/)
  assert.match(bridge, /_yoast_wpseo_focuskw/)
  assert.match(bridge, /_yoast_wpseo_title/)
  assert.match(bridge, /_yoast_wpseo_metadesc/)
  assert.match(bridge, /cms_yoast/)
})

test('imported HTML preserves safe links, rewrites internal paths, and maps media', () => {
  const mediaByUrl = new Map([
    [
      'https://wp.example/wp-content/uploads/image.webp',
      {
        id: mediaId,
        publicUrl: 'https://project.supabase.co/storage/v1/object/public/cms-media/image.webp',
      },
    ],
  ])
  const html = sanitizeImportedContentHtml({
    html: [
      '<p>Also Read: <a href="https://wp.example/tech/article/?source=related#more"><strong>Article</strong></a></p>',
      '<p><a href="https://external.example/news">External</a></p>',
      '<p><a href="javascript:alert(1)">Unsafe</a><script>alert(1)</script></p>',
      '<img src="https://wp.example/wp-content/uploads/image.webp" alt="Imported image">',
    ].join(''),
    wordpressBaseUrl: 'https://wp.example',
    primaryDomain: 'example.com',
    mediaByUrl,
  })

  assert.match(html, /href="\/tech\/article\/\?source=related#more"/)
  assert.match(html, /href="https:\/\/external\.example\/news"/)
  assert.doesNotMatch(html, /javascript:|<script/i)
  assert.match(html, new RegExp(`data-media-id="${mediaId}"`))
  assert.match(html, /project\.supabase\.co\/storage/)
})

test('WordPress import creates fallback author, saves posts, and clears temporary credentials', async () => {
  setValidEnv()
  const calls = []
  const wordpressAuthHeaders = []
  const importJobBodies = []

  global.fetch = async (url, options = {}) => {
    const stringUrl = String(url)
    calls.push({ url: stringUrl, options })

    if (stringUrl.startsWith('https://wp.example/wp-json/wp/v2/')) {
      wordpressAuthHeaders.push(options.headers?.Authorization || null)
      if (stringUrl.includes('/posts?')) {
        return Response.json([
          {
            id: 10,
            slug: 'hello-world',
            status: 'publish',
            date: '2026-07-01T00:00:00',
            title: { rendered: 'Hello World' },
            excerpt: { rendered: '<p>Intro</p>' },
            content: {
              rendered: '<p>Also Read: <a href="https://wp.example/tech/related-post/?from=post#next">Related post</a></p>',
            },
            cms_yoast: {
              focusKeyphrase: 'daily quiz, quiz answers',
              seoTitle: 'Yoast Post SEO Title',
              metaDescription: 'Yoast post bridge description',
            },
            yoast_head_json: {
              title: 'Generated Post Title',
              description: 'Yoast post generated description',
            },
            author: 99,
            categories: [],
            featured_media: null,
          },
        ])
      }
      if (stringUrl.includes('/users?')) {
        return Response.json([
          {
            id: 99,
            name: 'Imported Writer',
            slug: 'imported-writer',
            description: '<p>Writer &amp; editor</p>',
          },
        ])
      }
      if (stringUrl.includes('/media?')) {
        return Response.json([
          {
            id: 30,
            source_url: 'https://wp.example/wp-content/uploads/feature.png',
            media_details: {},
          },
        ])
      }
      if (stringUrl.includes('/pages?')) {
        return Response.json([
          {
            id: 20,
            slug: 'custom-page',
            status: 'publish',
            date: '2026-07-01T00:00:00',
            title: { rendered: 'Custom Page' },
            excerpt: { rendered: '<p>Page intro</p>' },
            content: {
              rendered: '<p>Page <a href="https://wp.example/about/?from=page#team">link</a></p>',
            },
            cms_yoast: {
              focusKeyphrase: 'custom page keyword',
              seoTitle: 'Yoast Page SEO Title',
              metaDescription: 'Yoast page bridge description',
            },
            yoast_head_json: {
              title: 'Generated Page Title',
              description: 'Yoast page generated description',
            },
            author: 99,
            featured_media: null,
          },
        ])
      }
      return Response.json([])
    }

    if (stringUrl === 'https://wp.example/wp-content/uploads/feature.png') {
      return new Response(await createTinyPngBytes(), {
        headers: { 'content-type': 'image/png' },
      })
    }

    if (stringUrl.includes('/rest/v1/cms_websites')) {
      return Response.json([websiteRow()])
    }

    if (stringUrl.endsWith('/rest/v1/cms_import_jobs')) {
      const body = JSON.parse(options.body)
      importJobBodies.push(body)
      return Response.json([jobRow(body)])
    }

    if (
      stringUrl.includes('/rest/v1/cms_import_jobs') &&
      options.method === 'PATCH'
    ) {
      const body = JSON.parse(options.body)
      importJobBodies.push(body)
      return Response.json([jobRow(body)])
    }

    if (stringUrl.endsWith('/rest/v1/cms_authors')) {
      return Response.json([authorRow()])
    }

    if (stringUrl.includes('/rest/v1/cms_authors')) {
      return Response.json([authorRow()])
    }

    if (stringUrl.endsWith('/rest/v1/cms_categories')) {
      if (options.method === 'POST') {
        return Response.json([categoryRow(JSON.parse(options.body))])
      }
      return Response.json([])
    }

    if (stringUrl.includes('/rest/v1/cms_categories')) {
      if (stringUrl.includes(categoryId)) {
        return Response.json([categoryRow()])
      }
      return Response.json([])
    }

    if (stringUrl.includes('/rest/v1/cms_site_settings')) {
      return Response.json([])
    }

    if (stringUrl.includes('/storage/v1/object/cms-media')) {
      return new Response(null, { status: 200 })
    }

    if (
      stringUrl.includes('/rest/v1/cms_media') &&
      options.method !== 'POST'
    ) {
      return Response.json([
        {
          id: mediaId,
          website_id: websiteId,
          original_filename: 'feature.png',
          storage_path: `websites/${websiteId}/media/2026/07/${mediaId}.webp`,
          public_url: 'https://project.supabase.co/storage/v1/object/public/cms-media/feature.webp',
          alt_text: 'Feature',
          caption: null,
          width: 10,
          height: 10,
          mime_type: 'image/webp',
          file_size: 100,
          source: 'wordpress_import',
          created_at: '2026-07-04T00:00:00.000Z',
          updated_at: '2026-07-04T00:00:00.000Z',
        },
      ])
    }

    if (stringUrl.endsWith('/rest/v1/cms_media')) {
      const body = JSON.parse(options.body)
      return Response.json([
        {
          id: mediaId,
          website_id: body.website_id,
          original_filename: body.original_filename,
          storage_path: body.storage_path,
          public_url: body.public_url,
          alt_text: body.alt_text,
          caption: body.caption,
          width: body.width,
          height: body.height,
          mime_type: body.mime_type,
          file_size: body.file_size,
          source: body.source,
          created_at: '2026-07-04T00:00:00.000Z',
          updated_at: '2026-07-04T00:00:00.000Z',
        },
      ])
    }

    if (stringUrl.endsWith('/rest/v1/cms_posts')) {
      const body = JSON.parse(options.body)
      return Response.json([postRow(body)])
    }

    if (stringUrl.endsWith('/rest/v1/cms_pages')) {
      const body = JSON.parse(options.body)
      return Response.json([pageRow(body)])
    }

    return Response.json([])
  }

  const { job, report } = await importWordPressForWebsite(
    websiteId,
    validateWordPressImportPayload({
      wordpressBaseUrl: 'https://wp.example',
      wordpressUsername: 'editor',
      wordpressApplicationPassword: 'app-password',
      confirmInactiveImport: true,
    })
  )
  const postInsert = calls.find((call) => call.url.endsWith('/rest/v1/cms_posts'))
  const pageInsert = calls.find((call) => call.url.endsWith('/rest/v1/cms_pages'))
  const authorInsert = calls.find((call) => call.url.endsWith('/rest/v1/cms_authors'))
  const postBody = JSON.parse(postInsert.options.body)
  const pageBody = JSON.parse(pageInsert.options.body)
  const authorBody = JSON.parse(authorInsert.options.body)

  assert.equal(job.status, 'succeeded')
  assert.equal(report.counts.posts, 1)
  assert.equal(report.counts.pages, 1)
  assert.equal(report.counts.authors, 1)
  assert.equal(authorBody.name, 'Imported Writer')
  assert.equal(authorBody.bio, 'Writer & editor')
  assert.equal(report.progress.phase, 'succeeded')
  assert.equal(report.progress.percent, 100)
  assert.ok(
    importJobBodies.some((body) => body.report?.progress?.phase === 'fetching')
  )
  assert.ok(
    importJobBodies.some((body) => body.report?.progress?.phase === 'posts')
  )
  assert.equal(postBody.author_id, authorId)
  assert.equal(postBody.category_id, categoryId)
  assert.equal(postBody.featured_image_id, null)
  assert.equal(postBody.og_image_id, null)
  assert.equal(postBody.focus_keyphrase, 'daily quiz, quiz answers')
  assert.equal(postBody.seo_title, 'Yoast Post SEO Title')
  assert.equal(postBody.meta_description, 'Yoast post generated description')
  assert.match(postBody.body_html, /href="\/tech\/related-post\/\?from=post#next"/)
  assert.ok(postBody.body_blocks.length > 0)
  assert.equal(pageBody.path, '/custom-page')
  assert.match(pageBody.body_text, /href="\/about\/\?from=page#team"/)
  assert.equal(pageBody.author_id, authorId)
  assert.equal(pageBody.featured_image_id, null)
  assert.equal(pageBody.focus_keyphrase, 'custom page keyword')
  assert.equal(pageBody.seo_title, 'Yoast Page SEO Title')
  assert.equal(pageBody.meta_description, 'Yoast page generated description')
  assert.ok(wordpressAuthHeaders.every((header) => header?.startsWith('Basic ')))
  assert.ok(importJobBodies[0].temporary_credentials_encrypted)
  assert.equal(importJobBodies.at(-1).temporary_credentials_encrypted, null)
})

test('WordPress import reset is inactive-only and deletes imported media objects only', async () => {
  setValidEnv()
  const deletes = []

  global.fetch = async (url, options = {}) => {
    const stringUrl = String(url)

    if (stringUrl.includes('/rest/v1/cms_websites')) {
      return Response.json([websiteRow()])
    }

    if (stringUrl.includes('/rest/v1/cms_media') && options.method !== 'DELETE') {
      return Response.json([
        {
          id: mediaId,
          website_id: websiteId,
          original_filename: 'wp.png',
          storage_path: `websites/${websiteId}/media/2026/07/${mediaId}.webp`,
          public_url: 'https://project.supabase.co/storage/v1/object/public/cms-media/wp.webp',
          alt_text: null,
          caption: null,
          width: 10,
          height: 10,
          mime_type: 'image/webp',
          file_size: 100,
          source: 'wordpress_import',
          deleted_at: null,
          created_at: '2026-07-04T00:00:00.000Z',
          updated_at: '2026-07-04T00:00:00.000Z',
        },
        {
          id: '66666666-6666-4666-8666-666666666666',
          website_id: websiteId,
          original_filename: 'manual.png',
          storage_path: `websites/${websiteId}/media/2026/07/66666666-6666-4666-8666-666666666666.webp`,
          public_url: 'https://project.supabase.co/storage/v1/object/public/cms-media/manual.webp',
          alt_text: null,
          caption: null,
          width: 10,
          height: 10,
          mime_type: 'image/webp',
          file_size: 100,
          source: 'upload',
          deleted_at: null,
          created_at: '2026-07-04T00:00:00.000Z',
          updated_at: '2026-07-04T00:00:00.000Z',
        },
      ])
    }

    if (options.method === 'DELETE') {
      deletes.push({ url: stringUrl, body: options.body })
      return new Response(null, { status: 204 })
    }

    return Response.json([])
  }

  const result = await resetWordPressImportForWebsite(websiteId)
  const storageDelete = deletes.find((call) => call.url.includes('/storage/v1/object/cms-media'))
  const mediaDelete = deletes.find((call) => call.url.includes('/rest/v1/cms_media'))

  assert.equal(result.reset, true)
  assert.equal(result.deletedImportedMediaObjects, 1)
  assert.match(storageDelete.body, /55555555-5555-4555-8555-555555555555/)
  assert.match(mediaDelete.url, /source=eq\.wordpress_import/)
})
