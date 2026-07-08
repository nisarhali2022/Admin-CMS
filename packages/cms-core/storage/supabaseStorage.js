import { getSupabaseAdminConfig } from '../supabase/adminRest.js'

export const CMS_MEDIA_BUCKET = 'cms-media'
export const MEDIA_CACHE_CONTROL_SECONDS = '31536000'

export class StorageError extends Error {
  constructor(message, { status = 500, details } = {}) {
    super(message)
    this.name = 'StorageError'
    this.status = status
    this.details = details
  }
}

function getStorageBaseUrl() {
  const { supabaseUrl } = getSupabaseAdminConfig()
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1`
}

function getStorageHeaders(extraHeaders = {}) {
  const { supabaseServiceRoleKey } = getSupabaseAdminConfig()

  return {
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    ...extraHeaders,
  }
}

function assertValidStoragePath(storagePath) {
  if (
    typeof storagePath !== 'string' ||
    !storagePath.startsWith('websites/') ||
    storagePath.includes('..')
  ) {
    throw new StorageError('Invalid Supabase Storage path.', {
      status: 400,
    })
  }
}

export function getPublicMediaUrl(storagePath) {
  assertValidStoragePath(storagePath)
  const { supabaseUrl } = getSupabaseAdminConfig()

  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${CMS_MEDIA_BUCKET}/${storagePath}`
}

export async function uploadPublicMediaObject({ storagePath, bytes }) {
  assertValidStoragePath(storagePath)

  const response = await fetch(
    `${getStorageBaseUrl()}/object/${CMS_MEDIA_BUCKET}/${storagePath}`,
    {
      method: 'PUT',
      headers: getStorageHeaders({
        'Content-Type': 'image/webp',
        'Cache-Control': `public, max-age=${MEDIA_CACHE_CONTROL_SECONDS}, immutable`,
        'cache-control': MEDIA_CACHE_CONTROL_SECONDS,
        'x-upsert': 'false',
      }),
      body: bytes,
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new StorageError('Unable to upload media to Supabase Storage.', {
      status: response.status,
      details,
    })
  }

  return {
    storagePath,
    publicUrl: getPublicMediaUrl(storagePath),
  }
}

export async function deleteMediaObject(storagePath) {
  assertValidStoragePath(storagePath)

  const response = await fetch(`${getStorageBaseUrl()}/object/${CMS_MEDIA_BUCKET}`, {
    method: 'DELETE',
    headers: getStorageHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ prefixes: [storagePath] }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new StorageError('Unable to delete media from Supabase Storage.', {
      status: response.status,
      details,
    })
  }

  return { deleted: true, storagePath }
}
