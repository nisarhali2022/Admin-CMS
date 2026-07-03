import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import {
  validateCategoryPayload,
  validateCategoryPatchPayload,
} from '../lib/cms/validators/categories.js'
import {
  validateAuthorPayload,
  validateAuthorPatchPayload,
} from '../lib/cms/validators/authors.js'
import { createAuthorForWebsite, permanentlyDeleteAuthor } from '../lib/cms/services/authors.js'
import { permanentlyDeleteCategory } from '../lib/cms/services/categories.js'

const originalFetch = global.fetch
const originalEnv = { ...process.env }

const websiteId = '11111111-1111-4111-8111-111111111111'
const mediaId = '22222222-2222-4222-8222-222222222222'
const authorId = '33333333-3333-4333-8333-333333333333'
const categoryId = '44444444-4444-4444-8444-444444444444'

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

test('category and author validators normalize slugs and payloads', () => {
  assert.deepEqual(
    validateCategoryPayload({
      name: 'Latest Offers',
      slug: '',
      description: 'News and offers',
    }),
    {
      name: 'Latest Offers',
      slug: 'latest-offers',
      description: 'News and offers',
    }
  )
  assert.deepEqual(validateCategoryPatchPayload({ description: '' }), {
    description: null,
  })
  assert.deepEqual(
    validateAuthorPayload({
      name: 'Nisar Ali',
      bio: '',
      avatarImageId: mediaId,
      isActive: false,
    }),
    {
      name: 'Nisar Ali',
      slug: 'nisar-ali',
      bio: null,
      avatarImageId: mediaId,
      isActive: false,
    }
  )
  assert.deepEqual(validateAuthorPatchPayload({ avatarImageId: null }), {
    avatarImageId: null,
  })
})

test('author service validates same-website avatar before creating author', async () => {
  setValidEnv()
  const calls = []

  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })

    if (String(url).includes('/rest/v1/cms_media')) {
      return Response.json([
        {
          id: mediaId,
          website_id: websiteId,
          original_filename: 'avatar.png',
          storage_path: `websites/${websiteId}/media/2026/07/${mediaId}.webp`,
          public_url: 'https://project.supabase.co/storage/v1/object/public/cms-media/avatar.webp',
          alt_text: 'Avatar',
          caption: null,
          width: 10,
          height: 10,
          mime_type: 'image/webp',
          file_size: 100,
          source: 'upload',
          deleted_at: null,
          created_at: '2026-07-03T00:00:00.000Z',
          updated_at: '2026-07-03T00:00:00.000Z',
        },
      ])
    }

    if (String(url).endsWith('/rest/v1/cms_authors')) {
      const body = JSON.parse(options.body)
      return Response.json([
        {
          id: authorId,
          website_id: body.website_id,
          name: body.name,
          slug: body.slug,
          bio: body.bio,
          avatar_image_id: body.avatar_image_id,
          is_active: body.is_active,
          deleted_at: null,
          created_at: '2026-07-03T00:00:00.000Z',
          updated_at: '2026-07-03T00:00:00.000Z',
        },
      ])
    }

    return Response.json([])
  }

  const author = await createAuthorForWebsite(websiteId, {
    name: 'Nisar Ali',
    slug: 'nisar-ali',
    bio: null,
    avatarImageId: mediaId,
    isActive: true,
  })
  const insertCall = calls.find((call) => call.url.endsWith('/rest/v1/cms_authors'))
  const insertBody = JSON.parse(insertCall.options.body)

  assert.equal(author.avatarImageId, mediaId)
  assert.equal(insertBody.website_id, websiteId)
  assert.equal(insertBody.avatar_image_id, mediaId)
  assert.ok(calls[0].url.includes(`website_id=eq.${websiteId}`))
})

test('author service rejects missing or cross-website avatar media', async () => {
  setValidEnv()
  global.fetch = async () => Response.json([])

  await assert.rejects(
    () =>
      createAuthorForWebsite(websiteId, {
        name: 'Nisar Ali',
        slug: 'nisar-ali',
        bio: null,
        avatarImageId: mediaId,
        isActive: true,
      }),
    /avatar image must belong/
  )
})

test('author and category permanent delete are blocked while posts reference them', async () => {
  setValidEnv()
  const calls = []

  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })
    return Response.json([{ id: '55555555-5555-4555-8555-555555555555' }])
  }

  await assert.rejects(
    () => permanentlyDeleteAuthor({ websiteId, authorId }),
    /Author is used by posts/
  )
  await assert.rejects(
    () => permanentlyDeleteCategory({ websiteId, categoryId }),
    /Category is used by posts/
  )

  assert.ok(calls.some((call) => call.url.includes(`author_id=eq.${authorId}`)))
  assert.ok(calls.some((call) => call.url.includes(`category_id=eq.${categoryId}`)))
  assert.ok(calls.every((call) => call.options.method !== 'DELETE'))
})
