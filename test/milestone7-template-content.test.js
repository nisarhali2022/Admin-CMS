import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import {
  collectMediaIds,
  validateTemplateContentPayload,
} from 'cms-core/cms/validators/templateContent'
import { validatePagePayload } from 'cms-core/cms/validators/pages'
import { createPageForWebsite } from 'cms-core/cms/services/pages'
import {
  createTemplateContentForWebsite,
  updateTemplateContentForWebsite,
} from 'cms-core/cms/services/templateContent'

const originalFetch = global.fetch
const originalEnv = { ...process.env }

const websiteId = '11111111-1111-4111-8111-111111111111'
const mediaId = '22222222-2222-4222-8222-222222222222'
const templateId = '33333333-3333-4333-8333-333333333333'
const authorId = '44444444-4444-4444-8444-444444444444'
const pageId = '55555555-5555-4555-8555-555555555555'

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
    focusKeyphrase: 'home page',
    authorId,
  })

  assert.equal(payload.templateKey, 'home')
  assert.equal(payload.focusKeyphrase, 'home page')
  assert.equal(payload.authorId, authorId)
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

    if (String(url).includes('/rest/v1/cms_authors')) {
      return Response.json([
        {
          id: authorId,
          website_id: websiteId,
          name: 'Muhammad Shabbar',
          slug: 'muhammad-shabbar',
          bio: '',
          avatar_image_id: null,
          is_active: true,
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
          focus_keyphrase: body.focus_keyphrase,
          seo_title: body.seo_title,
          meta_description: body.meta_description,
          author_id: body.author_id,
          canonical_url: body.canonical_url,
          robots_meta: body.robots_meta,
          og_image_id: body.og_image_id,
          sitemap_include: body.sitemap_include,
          published_at: body.published_at,
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
      focusKeyphrase: 'about company',
      authorId,
      status: 'draft',
    })
  )

  assert.equal(result.templateKey, 'about')
  assert.equal(result.ogImageId, mediaId)
  assert.equal(result.focusKeyphrase, 'about company')
  assert.equal(result.authorId, authorId)
  assert.equal(revalidation.skipped, true)
  assert.ok(calls.some((call) => call.url.includes('/rest/v1/cms_media')))
  assert.ok(calls.some((call) => call.url.includes('/rest/v1/cms_authors')))
})

test('custom page service normalizes path and saves page content', async () => {
  setValidEnv()
  const calls = []

  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })

    if (String(url).includes('/rest/v1/cms_media')) {
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
          source: 'upload',
          deleted_at: null,
          created_at: '2026-07-04T00:00:00.000Z',
          updated_at: '2026-07-04T00:00:00.000Z',
        },
      ])
    }

    if (String(url).includes('/rest/v1/cms_authors')) {
      return Response.json([
        {
          id: authorId,
          website_id: websiteId,
          name: 'Muhammad Shabbar',
          slug: 'muhammad-shabbar',
          bio: '',
          avatar_image_id: null,
          is_active: true,
          deleted_at: null,
          created_at: '2026-07-04T00:00:00.000Z',
          updated_at: '2026-07-04T00:00:00.000Z',
        },
      ])
    }

    if (String(url).endsWith('/rest/v1/cms_pages')) {
      const body = JSON.parse(options.body)
      return Response.json([
        {
          id: pageId,
          website_id: body.website_id,
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
        },
      ])
    }

    return Response.json([])
  }

  const { result, revalidation } = await createPageForWebsite(
    websiteId,
    validatePagePayload({
      title: 'About Custom',
      path: 'about-custom',
      bodyText: 'Custom body',
      focusKeyphrase: 'about custom',
      seoTitle: 'About Custom',
      metaDescription: 'Custom page',
      authorId,
      featuredImageId: mediaId,
      sitemapInclude: true,
    })
  )
  const pageInsert = calls.find((call) => call.url.endsWith('/rest/v1/cms_pages'))
  const pageBody = JSON.parse(pageInsert.options.body)

  assert.equal(result.path, '/about-custom')
  assert.equal(result.bodyText, 'Custom body')
  assert.equal(result.featuredImageId, mediaId)
  assert.equal(pageBody.path, '/about-custom')
  assert.equal(pageBody.status, undefined)
  assert.ok(pageBody.published_at)
  assert.equal(revalidation.skipped, true)
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

test('updating template content saves as published without status field', async () => {
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
        published_at: '2026-07-04T00:00:00.000Z',
        created_at: '2026-07-04T00:00:00.000Z',
        updated_at: '2026-07-04T00:00:00.000Z',
      },
    ])
  }

  const { result } = await updateTemplateContentForWebsite(websiteId, templateId, {
    title: 'Home',
  })
  const patchCall = calls[0]
  const body = JSON.parse(patchCall.options.body)

  assert.equal(result.status, undefined)
  assert.equal(patchCall.options.method, 'PATCH')
  assert.equal(body.status, undefined)
  assert.ok(body.published_at)
})
