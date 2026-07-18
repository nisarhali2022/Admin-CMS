import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import {
  collectPublicationDateUpdates,
  repairWordPressPostPublicationDates,
} from 'cms-core/cms/services/publicationDates'

const originalFetch = global.fetch
const originalEnv = { ...process.env }
const websiteId = '11111111-1111-4111-8111-111111111111'

function setValidEnv() {
  process.env.ADMIN_SECRET = 'test-admin-secret'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  process.env.CMS_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64')
}

afterEach(() => {
  global.fetch = originalFetch
  process.env = { ...originalEnv }
})

test('publication-date repair selects only matching published WordPress posts', () => {
  const result = collectPublicationDateUpdates({
    wordpressPosts: [
      {
        slug: 'latest-post',
        status: 'publish',
        date_gmt: '2026-07-16T10:30:00',
        title: { rendered: 'Latest post' },
      },
      {
        slug: 'missing-date',
        status: 'publish',
        title: { rendered: 'Missing date' },
      },
      {
        slug: 'draft-post',
        status: 'draft',
        date_gmt: '2026-07-17T10:30:00',
        title: { rendered: 'Draft post' },
      },
    ],
    cmsPosts: [
      {
        id: 'post-id',
        slug: 'latest-post',
        category_id: 'category-id',
        published_at: '2026-07-14T10:30:00.000Z',
      },
      {
        id: 'unchanged-id',
        slug: 'already-correct',
        category_id: 'category-id',
        published_at: '2026-07-15T10:30:00.000Z',
      },
      {
        id: 'not-in-source',
        slug: 'not-in-source',
        category_id: 'category-id',
        published_at: '2026-07-14T10:30:00.000Z',
      },
    ],
    categories: [{ id: 'category-id', slug: 'telecom' }],
  })

  assert.deepEqual(result.updates, [
    {
      id: 'post-id',
      slug: 'latest-post',
      categoryId: 'category-id',
      publishedAt: '2026-07-16T10:30:00.000Z',
    },
  ])
  assert.deepEqual(result.paths, ['/', '/blog', '/telecom'])
  assert.deepEqual(result.unmatchedCmsPosts, ['already-correct', 'not-in-source'])
  assert.deepEqual(result.skippedSourcePosts, [
    { slug: 'missing-date', reason: 'Missing or invalid WordPress publication date.' },
  ])
})

test('publication-date repair is dry-run by default and applies only publication timestamps', async () => {
  setValidEnv()
  const calls = []
  global.fetch = async (url, options = {}) => {
    const stringUrl = String(url)
    calls.push({ url: stringUrl, options })

    if (stringUrl.startsWith('https://wp.example/wp-json/wp/v2/posts')) {
      return Response.json([
        {
          slug: 'latest-post',
          status: 'publish',
          date_gmt: '2026-07-16T10:30:00',
          title: { rendered: 'Latest post' },
        },
      ])
    }
    if (stringUrl.includes('/rest/v1/cms_posts') && options.method !== 'PATCH') {
      return Response.json([
        {
          id: 'post-id',
          slug: 'latest-post',
          category_id: 'category-id',
          published_at: '2026-07-14T10:30:00.000Z',
        },
      ])
    }
    if (stringUrl.includes('/rest/v1/cms_categories')) {
      return Response.json([{ id: 'category-id', slug: 'telecom' }])
    }
    if (stringUrl.includes('/rest/v1/cms_site_settings')) return Response.json([])
    if (options.method === 'PATCH') return new Response(null, { status: 204 })
    return Response.json([])
  }

  const dryRun = await repairWordPressPostPublicationDates({
    websiteId,
    wordpressBaseUrl: 'https://wp.example',
  })
  assert.equal(dryRun.wouldUpdate, 1)
  assert.equal(dryRun.updated, 0)
  assert.equal(calls.some((call) => call.options.method === 'PATCH'), false)

  const applied = await repairWordPressPostPublicationDates({
    websiteId,
    wordpressBaseUrl: 'https://wp.example',
    apply: true,
  })
  const patchCall = calls.find((call) => call.options.method === 'PATCH')
  const patchBody = JSON.parse(patchCall.options.body)

  assert.equal(applied.updated, 1)
  assert.deepEqual(patchBody, { published_at: '2026-07-16T10:30:00.000Z' })
  assert.deepEqual(applied.paths, ['/', '/blog', '/telecom'])
  assert.equal(applied.revalidation.skipped, true)
})
