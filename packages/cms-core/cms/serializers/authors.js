import { serializeMedia } from './media.js'

export function serializeAuthor(row) {
  if (!row) return null

  return {
    id: row.id,
    websiteId: row.websiteId || row.website_id,
    name: row.name,
    slug: row.slug,
    bio: row.bio || null,
    avatarImageId: row.avatarImageId || row.avatar_image_id || null,
    avatarImage: serializeMedia(row.avatarImage || row.cms_media),
    isActive: row.isActive ?? row.is_active,
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
  }
}

export function serializeAuthors(rows) {
  return Array.isArray(rows) ? rows.map(serializeAuthor) : []
}
