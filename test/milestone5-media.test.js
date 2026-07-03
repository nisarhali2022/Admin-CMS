import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { afterEach, test } from 'node:test'
import sharp from 'sharp'

import { optimizeImageToWebp } from '../lib/storage/imageOptimizer.js'
import {
  MEDIA_CACHE_CONTROL_SECONDS,
  getPublicMediaUrl,
  uploadPublicMediaObject,
} from '../lib/storage/supabaseStorage.js'
import { uploadMedia } from '../lib/cms/services/media.js'

const migrationDir = 'supabase/migrations'
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
  const bytes = await sharp({
    create: {
      width: 2,
      height: 3,
      channels: 3,
      background: '#2563eb',
    },
  })
    .png()
    .toBuffer()

  return new File([bytes], 'sample.png', { type: 'image/png' })
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
  assert.equal(calls[0].options.headers['cache-control'], MEDIA_CACHE_CONTROL_SECONDS)
  assert.match(calls[0].options.headers['Cache-Control'], /immutable/)
  assert.equal(calls[0].options.headers['x-upsert'], 'false')
})

test('media usage migration checks all planned reference locations', async () => {
  const sql = await readMigration('admin_media_usage')

  assert.match(sql, /create or replace function public\.cms_admin_media_usage/)
  assert.match(sql, /cms_authors/)
  assert.match(sql, /avatar_image_id/)
  assert.match(sql, /cms_template_content/)
  assert.match(sql, /og_image_id/)
  assert.match(sql, /content_data::text/)
  assert.match(sql, /cms_posts/)
  assert.match(sql, /featured_image_id/)
  assert.match(sql, /body_blocks::text/)
  assert.match(sql, /grant execute on function public\.cms_admin_media_usage\(uuid, uuid\) to service_role/)
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
  const uploadCall = calls.find((call) => call.url.includes('/storage/v1/object/'))
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
})
