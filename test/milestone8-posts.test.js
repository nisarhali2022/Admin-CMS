import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import {
  collectPostMediaIds,
  validateBodyBlocks,
  validatePostPayload,
} from '../lib/cms/validators/posts.js'
import {
  createPostForWebsite,
  publishPostForWebsite,
} from '../lib/cms/services/posts.js'

const originalFetch = global.fetch
const originalEnv = { ...process.env }

const websiteId = '11111111-1111-4111-8111-111111111111'
const authorId = '22222222-2222-4222-8222-222222222222'
const categoryId = '33333333-3333-4333-8333-333333333333'
const featuredImageId = '44444444-4444-4444-8444-444444444444'
const bodyImageId = '55555555-5555-4555-8555-555555555555'
const postId = '66666666-6666-4666-8666-666666666666'

function setValidEnv() {
  process.env.ADMIN_SECRET = 'test-admin-secret'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  process.env.CMS_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64')
}

function mediaRow(id, filename = 'image.png') {
  return {
    id,
    website_id: websiteId,
    original_filename: filename,
    storage_path: `websites/${websiteId}/media/2026/07/${id}.webp`,
    public_url: `https://project.supabase.co/storage/v1/object/public/cms-media/${id}.webp`,
    alt_text: 'Alt',
    caption: null,
    width: 10,
    height: 10,
    mime_type: 'image/webp',
    file_size: 100,
    source: 'upload',
    deleted_at: null,
    created_at: '2026-07-04T00:00:00.000Z',
    updated_at: '2026-07-04T00:00:00.000Z',
  }
}

function authorRow(overrides = {}) {
  return {
    id: authorId,
    website_id: websiteId,
    name: 'Nisar Ali',
    slug: 'nisar-ali',
    bio: null,
    avatar_image_id: null,
    is_active: true,
    deleted_at: null,
    created_at: '2026-07-04T00:00:00.000Z',
    updated_at: '2026-07-04T00:00:00.000Z',
    ...overrides,
  }
}

function categoryRow() {
  return {
    id: categoryId,
    website_id: websiteId,
    name: 'News',
    slug: 'news',
    description: null,
    deleted_at: null,
    created_at: '2026-07-04T00:00:00.000Z',
    updated_at: '2026-07-04T00:00:00.000Z',
  }
}

function postRow(body) {
  return {
    id: postId,
    website_id: body.website_id || websiteId,
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

function validPayload(overrides = {}) {
  return validatePostPayload({
    title: 'Summer Packages',
    slug: 'summer-packages',
    excerpt: 'Latest offers',
    authorId,
    categoryId,
    featuredImageId,
    bodyBlocks: [
      { type: 'paragraph', text: 'Intro text' },
      { type: 'image', mediaId: bodyImageId, alt: 'Body image' },
      {
        type: 'faq',
        items: [{ question: 'Can I subscribe?', answer: 'Yes.' }],
      },
    ],
    seoTitle: 'Summer Packages',
    metaDescription: 'Latest packages and offers.',
    canonicalUrl: '/blog/summer-packages',
    robotsMeta: 'index,follow',
    ogImageId: featuredImageId,
    sitemapInclude: true,
    status: 'draft',
    ...overrides,
  })
}

afterEach(() => {
  global.fetch = originalFetch
  process.env = { ...originalEnv }
})

test('post validator accepts supported body blocks and rejects scheduling', () => {
  const payload = validPayload()

  assert.equal(payload.slug, 'summer-packages')
  assert.deepEqual([...collectPostMediaIds(payload)].sort(), [
    bodyImageId,
    featuredImageId,
  ].sort())
  assert.equal(payload.bodyBlocks[2].type, 'faq')
  assert.equal(payload.bodyBlocks[2].items[0].question, 'Can I subscribe?')

  assert.throws(
    () =>
      validatePostPayload({
        title: 'Scheduled',
        authorId,
        scheduledFor: '2026-07-10T00:00:00.000Z',
      }),
    /scheduling is not supported/
  )
  assert.throws(
    () => validateBodyBlocks([{ type: 'unsupported' }]),
    /Unsupported post block type/
  )
  assert.throws(
    () =>
      validatePostPayload({
        title: 'No author',
      }),
    /Valid media ID is required/
  )
})

test('post service validates author, category, and media before creating a post', async () => {
  setValidEnv()
  const calls = []

  global.fetch = async (url, options = {}) => {
    const stringUrl = String(url)
    calls.push({ url: stringUrl, options })

    if (stringUrl.includes('/rest/v1/cms_authors')) {
      return Response.json([authorRow()])
    }

    if (stringUrl.includes('/rest/v1/cms_categories')) {
      return Response.json([categoryRow()])
    }

    if (stringUrl.includes('/rest/v1/cms_media')) {
      if (stringUrl.includes(featuredImageId)) return Response.json([mediaRow(featuredImageId)])
      if (stringUrl.includes(bodyImageId)) return Response.json([mediaRow(bodyImageId)])
      return Response.json([])
    }

    if (stringUrl.endsWith('/rest/v1/cms_posts')) {
      const body = JSON.parse(options.body)
      return Response.json([postRow(body)])
    }

    return Response.json([])
  }

  const { result, revalidation } = await createPostForWebsite(websiteId, validPayload())
  const insertCall = calls.find((call) => call.url.endsWith('/rest/v1/cms_posts'))
  const insertBody = JSON.parse(insertCall.options.body)

  assert.equal(result.title, 'Summer Packages')
  assert.equal(result.authorId, authorId)
  assert.equal(insertBody.website_id, websiteId)
  assert.equal(insertBody.category_id, categoryId)
  assert.equal(insertBody.featured_image_id, featuredImageId)
  assert.equal(revalidation.skipped, true)
  assert.ok(calls.some((call) => call.url.includes('/rest/v1/cms_authors')))
  assert.ok(calls.some((call) => call.url.includes('/rest/v1/cms_categories')))
  assert.ok(calls.some((call) => call.url.includes('/rest/v1/cms_media')))
})

test('post service rejects inactive authors and missing media references', async () => {
  setValidEnv()

  global.fetch = async (url) => {
    const stringUrl = String(url)

    if (stringUrl.includes('/rest/v1/cms_authors')) {
      return Response.json([authorRow({ is_active: false })])
    }

    return Response.json([])
  }

  await assert.rejects(
    () => createPostForWebsite(websiteId, validPayload({ featuredImageId: null })),
    /Post author must be active/
  )

  global.fetch = async (url) => {
    const stringUrl = String(url)

    if (stringUrl.includes('/rest/v1/cms_authors')) return Response.json([authorRow()])
    if (stringUrl.includes('/rest/v1/cms_categories')) return Response.json([categoryRow()])
    if (stringUrl.includes('/rest/v1/cms_media')) return Response.json([])

    return Response.json([])
  }

  await assert.rejects(
    () => createPostForWebsite(websiteId, validPayload()),
    /Post media references must belong/
  )
})

test('publishing a post sets published status through repository call', async () => {
  setValidEnv()
  const calls = []

  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })
    const body = JSON.parse(options.body)
    return Response.json([postRow({ ...body, author_id: authorId, category_id: null })])
  }

  const { result } = await publishPostForWebsite(websiteId, postId)
  const patchCall = calls[0]
  const body = JSON.parse(patchCall.options.body)

  assert.equal(result.status, 'published')
  assert.equal(patchCall.options.method, 'PATCH')
  assert.equal(body.status, 'published')
  assert.ok(body.published_at)
})
