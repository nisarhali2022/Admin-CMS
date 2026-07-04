import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import {
  collectMediaIds,
  validateTemplateContentPayload,
} from '../lib/cms/validators/templateContent.js'
import {
  createTemplateContentForWebsite,
  publishTemplateContentForWebsite,
} from '../lib/cms/services/templateContent.js'

const originalFetch = global.fetch
const originalEnv = { ...process.env }

const websiteId = '11111111-1111-4111-8111-111111111111'
const mediaId = '22222222-2222-4222-8222-222222222222'
const templateId = '33333333-3333-4333-8333-333333333333'

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

test('template content validator accepts supported templates and rejects scheduling', () => {
  const payload = validateTemplateContentPayload({
    templateKey: 'home',
    path: '/',
    title: 'Home',
    contentData: {
      heroTitle: 'Hello',
      heroText: 'Welcome',
      ctaLabel: 'Start',
      ctaHref: '/packages',
      heroImage: { mediaId },
    },
    status: 'draft',
  })

  assert.equal(payload.templateKey, 'home')
  assert.equal(payload.contentData.heroImage.mediaId, mediaId)
  assert.deepEqual([...collectMediaIds(payload.contentData)], [mediaId])
  assert.throws(
    () =>
      validateTemplateContentPayload({
        templateKey: 'home',
        scheduledFor: '2026-07-10T00:00:00.000Z',
      }),
    /scheduling is not supported/
  )
  assert.throws(
    () =>
      validateTemplateContentPayload({
        templateKey: 'unknown',
      }),
    /Unsupported template key/
  )
})

test('template service validates media references before creating content', async () => {
  setValidEnv()
  const calls = []

  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })

    if (String(url).includes('/rest/v1/cms_media')) {
      return Response.json([
        {
          id: mediaId,
          website_id: websiteId,
          original_filename: 'hero.png',
          storage_path: `websites/${websiteId}/media/2026/07/${mediaId}.webp`,
          public_url: 'https://project.supabase.co/storage/v1/object/public/cms-media/hero.webp',
          alt_text: 'Hero',
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

    if (String(url).endsWith('/rest/v1/cms_template_content')) {
      const body = JSON.parse(options.body)
      return Response.json([
        {
          id: templateId,
          website_id: body.website_id,
          template_key: body.template_key,
          path: body.path,
          title: body.title,
          content_data: body.content_data,
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
        },
      ])
    }

    return Response.json([])
  }

  const { result, revalidation } = await createTemplateContentForWebsite(
    websiteId,
    validateTemplateContentPayload({
      templateKey: 'about',
      path: '/about',
      title: 'About',
      contentData: {
        introTitle: 'About',
        introText: 'Intro',
        bodyText: 'Body',
        mainImage: { mediaId },
      },
      ogImageId: mediaId,
      status: 'draft',
    })
  )

  assert.equal(result.templateKey, 'about')
  assert.equal(result.ogImageId, mediaId)
  assert.equal(revalidation.skipped, true)
  assert.ok(calls.some((call) => call.url.includes('/rest/v1/cms_media')))
})

test('template service rejects cross-website or missing media references', async () => {
  setValidEnv()
  global.fetch = async () => Response.json([])

  await assert.rejects(
    () =>
      createTemplateContentForWebsite(
        websiteId,
        validateTemplateContentPayload({
          templateKey: 'home',
          contentData: {
            heroTitle: '',
            heroText: '',
            ctaLabel: '',
            ctaHref: '',
            heroImage: { mediaId },
          },
        })
      ),
    /media references must belong/
  )
})

test('publishing template content sets published status through repository call', async () => {
  setValidEnv()
  const calls = []

  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })
    return Response.json([
      {
        id: templateId,
        website_id: websiteId,
        template_key: 'home',
        path: '/',
        title: 'Home',
        content_data: {},
        seo_title: null,
        meta_description: null,
        canonical_url: null,
        robots_meta: null,
        og_image_id: null,
        sitemap_include: true,
        status: 'published',
        published_at: '2026-07-04T00:00:00.000Z',
        deleted_at: null,
        created_at: '2026-07-04T00:00:00.000Z',
        updated_at: '2026-07-04T00:00:00.000Z',
      },
    ])
  }

  const { result } = await publishTemplateContentForWebsite(websiteId, templateId)
  const patchCall = calls[0]
  const body = JSON.parse(patchCall.options.body)

  assert.equal(result.status, 'published')
  assert.equal(patchCall.options.method, 'PATCH')
  assert.equal(body.status, 'published')
  assert.ok(body.published_at)
})
