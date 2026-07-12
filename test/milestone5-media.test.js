import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { afterEach, test } from 'node:test'
import sharp from 'sharp'

import { MAX_IMAGE_WIDTH, optimizeImageToWebp } from 'cms-core/storage/imageOptimizer'
import {
  MEDIA_CACHE_CONTROL_SECONDS,
  deleteMediaObjectsForWebsite,
  getCmsStorageUsage,
  getConfiguredStorageQuotaBytes,
  getPublicMediaUrl,
  uploadPublicMediaObject,
} from 'cms-core/storage/supabaseStorage'
import { uploadMedia } from 'cms-core/cms/services/media'
import {
  getMediaStoragePath,
  getReadableMediaFilename,
  isReadableMediaStoragePath,
} from 'cms-core/cms/services/media'

const migrationDir = 'setup-provisioning/supabase/migrations'
const originalFetch = global.fetch
const originalEnv = { ...process.env }

async function readMigration(namePart) {
  const files = await readdir(migrationDir)
  const file = files.find((candidate) => candidate.includes(namePart))

  assert.ok(file, `Expected migration containing ${namePart}`)

  return readFile(`${migrationDir}/${file}`, 'utf8')
}

function setValidEnv() {
  process.env.ADMIN_SECRET = 'test-admin-secret'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  process.env.CMS_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64')
}

async function createPngFile() {
  return createPngFileWithDimensions(2, 3)
}

async function createPngFileWithDimensions(width, height) {
  const bytes = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#2563eb',
    },
  })
    .png()
    .toBuffer()

  return new File([bytes], 'sample.png', { type: 'image/png' })
}

async function createJpgFile() {
  const bytes = await sharp({
    create: {
      width: 4,
      height: 5,
      channels: 3,
      background: '#16a34a',
    },
  })
    .jpeg()
    .toBuffer()

  return new File([bytes], 'sample.jpg', { type: 'image/jpeg' })
}

afterEach(() => {
  global.fetch = originalFetch
  process.env = { ...originalEnv }
})

test('sharp optimizer converts accepted uploads to WebP with dimensions', async () => {
  const result = await optimizeImageToWebp(await createPngFile())

  assert.equal(result.mimeType, 'image/webp')
  assert.equal(result.width, 2)
  assert.equal(result.height, 3)
  assert.ok(result.fileSize > 0)
  assert.equal((await sharp(result.bytes).metadata()).format, 'webp')
})

test('sharp optimizer converts JPG uploads to compressed WebP', async () => {
  const optimizer = await readFile('packages/cms-core/storage/imageOptimizer.js', 'utf8')
  const result = await optimizeImageToWebp(await createJpgFile())

  assert.equal(result.mimeType, 'image/webp')
  assert.equal(result.width, 4)
  assert.equal(result.height, 5)
  assert.equal((await sharp(result.bytes).metadata()).format, 'webp')
  assert.match(optimizer, /quality:\s*82/)
  assert.match(optimizer, /effort:\s*5/)
})

test('sharp optimizer resizes only images wider than 1200px', async () => {
  const optimizer = await readFile('packages/cms-core/storage/imageOptimizer.js', 'utf8')
  const small = await optimizeImageToWebp(await createPngFileWithDimensions(600, 300))
  const medium = await optimizeImageToWebp(await createPngFileWithDimensions(900, 450))
  const exact = await optimizeImageToWebp(await createPngFileWithDimensions(1200, 600))
  const large = await optimizeImageToWebp(await createPngFileWithDimensions(1600, 800))

  assert.equal(MAX_IMAGE_WIDTH, 1200)
  assert.equal(small.width, 600)
  assert.equal(small.height, 300)
  assert.equal(medium.width, 900)
  assert.equal(medium.height, 450)
  assert.equal(exact.width, 1200)
  assert.equal(exact.height, 600)
  assert.equal(large.width, 1200)
  assert.equal(large.height, 600)
  assert.equal((await sharp(large.bytes).metadata()).format, 'webp')
  assert.match(optimizer, /withoutEnlargement:\s*true/)
})

test('storage helper builds public URLs and uploads immutable WebP objects', async () => {
  setValidEnv()
  const calls = []

  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })
    return Response.json({})
  }

  const storagePath =
    'websites/11111111-1111-4111-8111-111111111111/media/2026/07/22222222-2222-4222-8222-222222222222.webp'
  const publicUrl = getPublicMediaUrl(storagePath)

  assert.equal(
    publicUrl,
    `https://project.supabase.co/storage/v1/object/public/cms-media/${storagePath}`
  )

  await uploadPublicMediaObject({
    storagePath,
    bytes: Buffer.from('webp-bytes'),
  })

  assert.match(calls[0].url, /\/storage\/v1\/object\/cms-media\/websites\//)
  assert.equal(calls[0].options.method, 'PUT')
  assert.equal(calls[0].options.headers['Content-Type'], 'image/webp')
  assert.equal(
    calls[0].options.headers['Cache-Control'],
    `public, max-age=${MEDIA_CACHE_CONTROL_SECONDS}, immutable`
  )
  assert.equal(calls[0].options.headers['cache-control'], undefined)
  assert.equal(calls[0].options.headers['x-upsert'], 'false')
})

test('media storage paths preserve readable filenames and add numeric collision suffixes', () => {
  const websiteId = '11111111-1111-4111-8111-111111111111'
  const date = new Date('2026-07-12T00:00:00.000Z')
  const first = getMediaStoragePath(websiteId, 'BT-and-Verizon-Merge.webp', date)
  const second = getMediaStoragePath(
    websiteId,
    'BT-and-Verizon-Merge.webp',
    date,
    new Set([first])
  )

  assert.equal(getReadableMediaFilename('BT-and-Verizon-Merge.webp'), 'BT-and-Verizon-Merge.webp')
  assert.equal(getReadableMediaFilename('my image.jpg'), 'my-image.webp')
  assert.match(first, /\/BT-and-Verizon-Merge\.webp$/)
  assert.match(second, /\/BT-and-Verizon-Merge-2\.webp$/)
  assert.equal(isReadableMediaStoragePath(first), true)
  assert.equal(isReadableMediaStoragePath(
    `websites/${websiteId}/media/2026/07/d5d55114-e7fb-48d4-8d8d-50e1ac7694fd.webp`
  ), false)
})

test('media filename migration is setup-owned and updates paths without changing media IDs', async () => {
  const service = await readFile(
    'packages/cms-core/cms/services/mediaFilenameMigration.js',
    'utf8'
  )
  const route = await readFile(
    'setup-provisioning/app/api/cms/media/migrate-filenames/route.js',
    'utf8'
  )

  assert.match(service, /listMedia\(websiteId\)/)
  assert.match(service, /downloadMediaObject\(oldPath\)/)
  assert.match(service, /updateMediaStorageLocation\(websiteId, item\.id/)
  assert.match(service, /triggerRevalidation/)
  assert.match(service, /isReadableMediaStoragePath\(item\.storagePath\)/)
  assert.match(route, /requireAdminSessionResponse/)
  assert.match(route, /migrateMediaFilenamesForWebsite/)
})

test('storage helper deletes only objects under the selected website prefix', async () => {
  setValidEnv()
  const calls = []
  const websiteId = '11111111-1111-4111-8111-111111111111'
  const storagePaths = [
    `websites/${websiteId}/media/2026/07/a.webp`,
    `websites/${websiteId}/media/2026/07/b.webp`,
  ]

  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })

    if (String(url).includes('/object/list/cms-media')) {
      const body = JSON.parse(options.body)
      if (body.prefix === `websites/${websiteId}`) {
        return Response.json([{ id: null, name: 'media' }])
      }
      if (body.prefix === `websites/${websiteId}/media`) {
        return Response.json([{ id: null, name: '2026' }])
      }
      if (body.prefix === `websites/${websiteId}/media/2026`) {
        return Response.json([{ id: null, name: '07' }])
      }
      if (body.prefix === `websites/${websiteId}/media/2026/07`) {
        return Response.json([
          { id: 'file-a', name: 'a.webp' },
          { id: 'file-b', name: 'b.webp' },
        ])
      }
    }

    return Response.json({})
  }

  const result = await deleteMediaObjectsForWebsite(websiteId)

  assert.equal(result.objectCount, 2)
  const deleteCall = calls.find((call) => call.options.method === 'DELETE')
  assert.ok(deleteCall)
  assert.deepEqual(JSON.parse(deleteCall.options.body), { prefixes: storagePaths })
  assert.equal(deleteCall.options.headers.Authorization, 'Bearer service-role-key')
})

test('storage usage helper totals cms-media objects against configured quota', async () => {
  setValidEnv()
  process.env.SUPABASE_STORAGE_QUOTA_BYTES = '4096'

  const entriesByPrefix = {
    websites: [{ id: null, name: 'site-a' }],
    'websites/site-a': [{ id: null, name: 'media' }],
    'websites/site-a/media': [{ id: null, name: '2026' }],
    'websites/site-a/media/2026': [{ id: null, name: '07' }],
    'websites/site-a/media/2026/07': [
      { id: 'file-a', name: 'a.webp', metadata: { size: 1024 } },
      { id: 'file-b', name: 'b.webp', metadata: { size: 2048 } },
      { id: 'file-c', name: 'c.webp', metadata: { size: 'bad-size' } },
    ],
  }

  global.fetch = async (url, options = {}) => {
    assert.match(String(url), /\/storage\/v1\/object\/list\/cms-media$/)
    assert.equal(options.method, 'POST')
    assert.equal(options.headers.Authorization, 'Bearer service-role-key')

    const body = JSON.parse(options.body)
    return Response.json(entriesByPrefix[body.prefix] || [])
  }

  const usage = await getCmsStorageUsage()

  assert.equal(getConfiguredStorageQuotaBytes(), 4096)
  assert.equal(usage.bucket, 'cms-media')
  assert.equal(usage.objectCount, 3)
  assert.equal(usage.usedBytes, 3072)
  assert.equal(usage.quotaBytes, 4096)
  assert.equal(usage.quotaConfigured, true)
  assert.equal(usage.remainingBytes, 1024)
  assert.equal(usage.overQuotaBytes, 0)
  assert.equal(usage.usagePercent, 75)
})

test('storage usage helper handles missing and over-quota configuration safely', async () => {
  setValidEnv()

  global.fetch = async () =>
    Response.json([{ id: 'file-a', name: 'a.webp', metadata: { size: 2048 } }])

  delete process.env.SUPABASE_STORAGE_QUOTA_BYTES
  const unconfigured = await getCmsStorageUsage()

  assert.equal(getConfiguredStorageQuotaBytes(), null)
  assert.equal(unconfigured.objectCount, 1)
  assert.equal(unconfigured.usedBytes, 2048)
  assert.equal(unconfigured.quotaConfigured, false)
  assert.equal(unconfigured.remainingBytes, null)
  assert.equal(unconfigured.usagePercent, null)

  process.env.SUPABASE_STORAGE_QUOTA_BYTES = '1024'
  const overQuota = await getCmsStorageUsage()

  assert.equal(overQuota.quotaConfigured, true)
  assert.equal(overQuota.remainingBytes, 0)
  assert.equal(overQuota.overQuotaBytes, 1024)
  assert.equal(overQuota.usagePercent, 100)
})

test('storage usage route is admin-only and returns aggregate storage data', async () => {
  const route = await readFile('app/api/cms/storage/usage/route.js', 'utf8')

  assert.match(route, /requireAdminSessionResponse/)
  assert.match(route, /getCmsStorageUsage/)
  assert.match(route, /cmsJson\(\{ storage:/)
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY/)
})

test('media usage migration checks all planned reference locations', async () => {
  const sql = await readMigration('admin_media_usage')
  const postBodyHtmlSql = await readMigration('post_body_html')

  assert.match(sql, /create or replace function public\.cms_admin_media_usage/)
  assert.match(sql, /cms_authors/)
  assert.match(sql, /avatar_image_id/)
  assert.match(sql, /cms_template_content/)
  assert.match(sql, /og_image_id/)
  assert.match(sql, /content_data::text/)
  assert.match(sql, /cms_posts/)
  assert.match(sql, /featured_image_id/)
  assert.match(sql, /body_blocks::text/)
  assert.match(postBodyHtmlSql, /create or replace function public\.cms_admin_media_usage/)
  assert.match(postBodyHtmlSql, /body_html/)
  assert.match(postBodyHtmlSql, /'bodyHtml'::text/)
  assert.match(sql, /grant execute on function public\.cms_admin_media_usage\(uuid, uuid\) to service_role/)
  assert.match(postBodyHtmlSql, /grant execute on function public\.cms_admin_media_usage\(uuid, uuid\) to service_role/)
})

test('media upload service scopes storage path and creates cms_media metadata', async () => {
  setValidEnv()
  const calls = []
  const websiteId = '11111111-1111-4111-8111-111111111111'

  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })

    if (String(url).includes('/rest/v1/cms_websites')) {
      return Response.json([
        {
          id: websiteId,
          name: 'Example Site',
          slug: 'example-site',
          primary_domain: 'example.com',
          is_active: false,
          created_at: '2026-07-03T00:00:00.000Z',
          updated_at: '2026-07-03T00:00:00.000Z',
        },
      ])
    }

    if (String(url).includes('/storage/v1/object/cms-media/')) {
      return Response.json({})
    }

    if (String(url).endsWith('/rest/v1/cms_media')) {
      const body = JSON.parse(options.body)
      return Response.json([
        {
          id: '33333333-3333-4333-8333-333333333333',
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
          deleted_at: null,
          created_at: '2026-07-03T00:00:00.000Z',
          updated_at: '2026-07-03T00:00:00.000Z',
        },
      ])
    }

    return Response.json({})
  }

  const media = await uploadMedia({
    websiteId,
    file: await createPngFile(),
    altText: 'Blue sample',
    caption: 'Sample caption',
  })
  const uploadCall = calls.find(
    (call) => call.url.includes('/storage/v1/object/') && call.options.method === 'PUT'
  )
  const insertCall = calls.find((call) => call.url.endsWith('/rest/v1/cms_media'))
  const insertBody = JSON.parse(insertCall.options.body)

  assert.match(media.storagePath, new RegExp(`^websites/${websiteId}/media/`))
  assert.match(media.storagePath, /\.webp$/)
  assert.equal(media.mimeType, 'image/webp')
  assert.equal(media.altText, 'Blue sample')
  assert.equal(insertBody.source, 'upload')
  assert.equal(insertBody.width, 2)
  assert.equal(insertBody.height, 3)
  assert.match(uploadCall.options.headers['Cache-Control'], /max-age=31536000/)

  const fallbackMedia = await uploadMedia({
    websiteId,
    file: await createJpgFile(),
    altText: null,
    caption: null,
  })

  assert.equal(fallbackMedia.altText, 'sample')
})
