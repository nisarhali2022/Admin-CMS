import { serializeMedia, serializeMediaList } from '../serializers/media.js'
import { supabaseAdminRequest, supabaseAdminRpc } from '../../supabase/adminRest.js'

const MEDIA_SELECT =
  'id,website_id,original_filename,storage_path,public_url,alt_text,caption,width,height,mime_type,file_size,source,created_at,updated_at'

export async function listMedia(websiteId) {
  const rows = await supabaseAdminRequest(
    `cms_media?select=${MEDIA_SELECT}&website_id=eq.${encodeURIComponent(websiteId)}&order=created_at.desc`
  )

  return serializeMediaList(rows)
}

export async function getMedia(websiteId, mediaId) {
  const rows = await supabaseAdminRequest(
    `cms_media?select=${MEDIA_SELECT}&website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(mediaId)}&limit=1`
  )

  return serializeMedia(rows?.[0])
}

export async function createMedia(row) {
  const rows = await supabaseAdminRequest('cms_media', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: {
      website_id: row.websiteId,
      original_filename: row.originalFilename,
      storage_path: row.storagePath,
      public_url: row.publicUrl,
      alt_text: row.altText,
      caption: row.caption,
      width: row.width,
      height: row.height,
      mime_type: row.mimeType,
      file_size: row.fileSize,
      source: row.source,
    },
  })

  return serializeMedia(rows?.[0])
}

export async function updateMediaMetadata(websiteId, mediaId, payload) {
  const update = {}

  if (Object.hasOwn(payload, 'altText')) update.alt_text = payload.altText
  if (Object.hasOwn(payload, 'caption')) update.caption = payload.caption

  const rows = await supabaseAdminRequest(
    `cms_media?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(mediaId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: update,
    }
  )

  return serializeMedia(rows?.[0])
}

export async function hardDeleteMediaRow(websiteId, mediaId) {
  await supabaseAdminRequest(
    `cms_media?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(mediaId)}`,
    {
      method: 'DELETE',
      headers: {
        Prefer: 'return=minimal',
      },
    }
  )
}

export async function getMediaUsage(websiteId, mediaId) {
  return supabaseAdminRpc('cms_admin_media_usage', {
    input_website_id: websiteId,
    input_media_id: mediaId,
  })
}
