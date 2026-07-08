export function serializeCategory(row) {
  if (!row) return null

  return {
    id: row.id,
    websiteId: row.websiteId || row.website_id,
    name: row.name,
    slug: row.slug,
    description: row.description || null,
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
  }
}

export function serializeCategories(rows) {
  return Array.isArray(rows) ? rows.map(serializeCategory) : []
}
