import { serializeAuthor, serializeAuthors } from '../serializers/authors.js'
import { supabaseAdminRequest } from '../../supabase/adminRest.js'

const AUTHOR_SELECT =
  'id,website_id,name,slug,bio,avatar_image_id,is_active,created_at,updated_at'

export async function listAuthors(websiteId) {
  const rows = await supabaseAdminRequest(
    `cms_authors?select=${AUTHOR_SELECT}&website_id=eq.${encodeURIComponent(websiteId)}&order=name.asc`
  )

  return serializeAuthors(rows)
}

export async function getAuthor(websiteId, authorId) {
  const rows = await supabaseAdminRequest(
    `cms_authors?select=${AUTHOR_SELECT}&website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(authorId)}&limit=1`
  )

  return serializeAuthor(rows?.[0])
}

export async function createAuthor(websiteId, payload) {
  const rows = await supabaseAdminRequest('cms_authors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: {
      website_id: websiteId,
      name: payload.name,
      slug: payload.slug,
      bio: payload.bio,
      avatar_image_id: payload.avatarImageId,
      is_active: payload.isActive,
    },
  })

  return serializeAuthor(rows?.[0])
}

export async function updateAuthor(websiteId, authorId, payload) {
  const update = {}

  if (Object.hasOwn(payload, 'name')) update.name = payload.name
  if (Object.hasOwn(payload, 'slug')) update.slug = payload.slug
  if (Object.hasOwn(payload, 'bio')) update.bio = payload.bio
  if (Object.hasOwn(payload, 'avatarImageId')) {
    update.avatar_image_id = payload.avatarImageId
  }
  if (Object.hasOwn(payload, 'isActive')) update.is_active = payload.isActive

  const rows = await supabaseAdminRequest(
    `cms_authors?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(authorId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: update,
    }
  )

  return serializeAuthor(rows?.[0])
}

export async function hardDeleteAuthor(websiteId, authorId) {
  await supabaseAdminRequest(
    `cms_authors?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(authorId)}`,
    {
      method: 'DELETE',
      headers: {
        Prefer: 'return=minimal',
      },
    }
  )
}
