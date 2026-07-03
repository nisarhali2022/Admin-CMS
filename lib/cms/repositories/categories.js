import { serializeCategories, serializeCategory } from '../serializers/categories.js'
import { supabaseAdminRequest } from '../../supabase/adminRest.js'

const CATEGORY_SELECT =
  'id,website_id,name,slug,description,deleted_at,created_at,updated_at'

export async function listCategories(websiteId, { includeTrashed = false } = {}) {
  const deletedFilter = includeTrashed ? '' : '&deleted_at=is.null'
  const rows = await supabaseAdminRequest(
    `cms_categories?select=${CATEGORY_SELECT}&website_id=eq.${encodeURIComponent(websiteId)}${deletedFilter}&order=name.asc`
  )

  return serializeCategories(rows)
}

export async function createCategory(websiteId, payload) {
  const rows = await supabaseAdminRequest('cms_categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: {
      website_id: websiteId,
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
    },
  })

  return serializeCategory(rows?.[0])
}

export async function updateCategory(websiteId, categoryId, payload) {
  const update = {}

  if (Object.hasOwn(payload, 'name')) update.name = payload.name
  if (Object.hasOwn(payload, 'slug')) update.slug = payload.slug
  if (Object.hasOwn(payload, 'description')) update.description = payload.description

  const rows = await supabaseAdminRequest(
    `cms_categories?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(categoryId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: update,
    }
  )

  return serializeCategory(rows?.[0])
}

export async function trashCategory(websiteId, categoryId) {
  const rows = await supabaseAdminRequest(
    `cms_categories?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(categoryId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: {
        deleted_at: new Date().toISOString(),
      },
    }
  )

  return serializeCategory(rows?.[0])
}

export async function restoreCategory(websiteId, categoryId) {
  const rows = await supabaseAdminRequest(
    `cms_categories?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(categoryId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: {
        deleted_at: null,
      },
    }
  )

  return serializeCategory(rows?.[0])
}

export async function hardDeleteCategory(websiteId, categoryId) {
  await supabaseAdminRequest(
    `cms_categories?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(categoryId)}`,
    {
      method: 'DELETE',
      headers: {
        Prefer: 'return=minimal',
      },
    }
  )
}
