export function serializeMedia(row) {
  if (!row) return null

  return {
    id: row.id,
    websiteId: row.websiteId || row.website_id,
    originalFilename: row.originalFilename || row.original_filename,
    storagePath: row.storagePath || row.storage_path,
    publicUrl: row.publicUrl || row.public_url,
    altText: row.altText ?? row.alt_text ?? null,
    caption: row.caption ?? null,
    width: row.width ?? null,
    height: row.height ?? null,
    mimeType: row.mimeType || row.mime_type,
    fileSize: row.fileSize || row.file_size,
    source: row.source,
    deletedAt: row.deletedAt || row.deleted_at || null,
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
  }
}

export function serializeMediaList(rows) {
  return Array.isArray(rows) ? rows.map(serializeMedia) : []
}
