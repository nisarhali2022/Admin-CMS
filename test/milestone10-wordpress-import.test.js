import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import { importWordPressForWebsite, resetWordPressImportForWebsite } from 'cms-core/cms/services/import'
import { validateWordPressImportPayload } from 'cms-core/cms/validators/import'

const originalFetch = global.fetch
const originalEnv = { ...process.env }

const websiteId = '11111111-1111-4111-8111-111111111111'
const jobId = '22222222-2222-4222-8222-222222222222'
const authorId = '33333333-3333-4333-8333-333333333333'
const postId = '44444444-4444-4444-8444-444444444444'
const mediaId = '55555555-5555-4555-8555-555555555555'
const pageId = '77777777-7777-4777-8777-777777777777'

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

function postRow(body) {
  return {
    id: postId,
    website_id: websiteId,
    category_id: body.category_id,
    author_id: body.author_id,
    title: body.title,
    slug: body.slug,
    excerpt: body.excerpt,
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
            content: { rendered: '<p>Body text</p>' },
            author: 99,
            categories: [],
            featured_media: 0,
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
            content: { rendered: '<p>Page body</p>' },
            author: 99,
            featured_media: 0,
          },
        ])
      }
      return Response.json([])
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

    if (stringUrl.includes('/rest/v1/cms_site_settings')) {
      return Response.json([])
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
  const postBody = JSON.parse(postInsert.options.body)
  const pageBody = JSON.parse(pageInsert.options.body)

  assert.equal(job.status, 'succeeded')
  assert.equal(report.counts.posts, 1)
  assert.equal(report.counts.pages, 1)
  assert.equal(report.counts.authors, 1)
  assert.equal(report.progress.phase, 'succeeded')
  assert.equal(report.progress.percent, 100)
  assert.ok(
    importJobBodies.some((body) => body.report?.progress?.phase === 'fetching')
  )
  assert.ok(
    importJobBodies.some((body) => body.report?.progress?.phase === 'posts')
  )
  assert.equal(postBody.author_id, authorId)
  assert.ok(postBody.body_blocks.length > 0)
  assert.equal(pageBody.path, '/custom-page')
  assert.equal(pageBody.body_text, 'Page body')
  assert.equal(pageBody.author_id, authorId)
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
