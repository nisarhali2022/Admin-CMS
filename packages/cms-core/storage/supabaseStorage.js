import { getSupabaseAdminConfig } from '../supabase/adminRest.js'

export const CMS_MEDIA_BUCKET = 'cms-media'
export const MEDIA_CACHE_CONTROL_SECONDS = '31536000'
const STORAGE_LIST_LIMIT = 1000

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

function getStorageListUrl() {
  return `${getStorageBaseUrl()}/object/list/${CMS_MEDIA_BUCKET}`
}

async function listStorageEntries(prefix) {
  const entries = []
  let offset = 0

  while (true) {
    const response = await fetch(getStorageListUrl(), {
      method: 'POST',
      headers: getStorageHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        prefix,
        limit: STORAGE_LIST_LIMIT,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      }),
      cache: 'no-store',
    })

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      throw new StorageError('Unable to list Supabase Storage objects.', {
        status: response.status,
        details,
      })
    }

    const batch = await response.json().catch(() => [])
    if (!Array.isArray(batch) || batch.length === 0) break

    entries.push(...batch)
    if (batch.length < STORAGE_LIST_LIMIT) break
    offset += STORAGE_LIST_LIMIT
  }

  return entries
}

function joinStoragePath(prefix, name) {
  return prefix ? `${prefix}/${name}` : name
}

async function listMediaObjectsUnderPrefix(prefix) {
  const queue = [prefix]
  const files = []

  while (queue.length > 0) {
    const prefix = queue.shift()
    const entries = await listStorageEntries(prefix)

    for (const entry of entries) {
      const path = joinStoragePath(prefix, entry.name)

      if (entry?.id) {
        files.push({ ...entry, path })
      } else if (entry?.name) {
        queue.push(path)
      }
    }
  }

  return files
}

async function listAllMediaObjects() {
  return listMediaObjectsUnderPrefix('websites')
}

export function getConfiguredStorageQuotaBytes(source = process.env) {
  const rawValue = typeof source.SUPABASE_STORAGE_QUOTA_BYTES === 'string'
    ? source.SUPABASE_STORAGE_QUOTA_BYTES.trim()
    : ''

  if (!/^\d+$/.test(rawValue)) return null

  const quotaBytes = Number(rawValue)
  return Number.isSafeInteger(quotaBytes) && quotaBytes > 0 ? quotaBytes : null
}

export async function getCmsStorageUsage() {
  const files = await listAllMediaObjects()
  const usedBytes = files.reduce((total, file) => {
    const size = Number(file?.metadata?.size)
    return total + (Number.isFinite(size) && size > 0 ? size : 0)
  }, 0)
  const quotaBytes = getConfiguredStorageQuotaBytes()
  const quotaConfigured = quotaBytes !== null
  const remainingBytes = quotaConfigured ? Math.max(quotaBytes - usedBytes, 0) : null
  const overQuotaBytes = quotaConfigured ? Math.max(usedBytes - quotaBytes, 0) : 0

  return {
    bucket: CMS_MEDIA_BUCKET,
    objectCount: files.length,
    usedBytes,
    quotaBytes,
    quotaConfigured,
    remainingBytes,
    overQuotaBytes,
    usagePercent: quotaConfigured
      ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100))
      : null,
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

export async function deleteMediaObjectsForWebsite(websiteId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(websiteId || ''))) {
    throw new StorageError('Invalid website storage prefix.', { status: 400 })
  }

  const storagePaths = (await listMediaObjectsUnderPrefix(`websites/${websiteId}`))
    .map((entry) => entry.path)

  if (storagePaths.length === 0) {
    return { deleted: true, websiteId, objectCount: 0 }
  }

  const response = await fetch(`${getStorageBaseUrl()}/object/${CMS_MEDIA_BUCKET}`, {
    method: 'DELETE',
    headers: getStorageHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ prefixes: storagePaths }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new StorageError('Unable to delete website media from Supabase Storage.', {
      status: response.status,
      details,
    })
  }

  return { deleted: true, websiteId, objectCount: storagePaths.length }
}
