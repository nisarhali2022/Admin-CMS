export function serializeWebsite(row) {
  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    primaryDomain: row.primaryDomain || row.primary_domain,
    isActive: row.isActive ?? row.is_active,
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
  }
}

export function serializeWebsites(rows) {
  return Array.isArray(rows) ? rows.map(serializeWebsite) : []
}
