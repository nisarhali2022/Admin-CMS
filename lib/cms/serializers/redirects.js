export function serializeRedirect(row) {
  if (!row) return null

  return {
    id: row.id,
    websiteId: row.websiteId || row.website_id,
    fromPath: row.fromPath || row.from_path,
    toUrl: row.toUrl || row.to_url,
    redirectType: row.redirectType || row.redirect_type,
    isActive: row.isActive ?? row.is_active,
    hitCount: row.hitCount ?? row.hit_count ?? 0,
    lastHitAt: row.lastHitAt || row.last_hit_at || null,
    deletedAt: row.deletedAt || row.deleted_at || null,
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
  }
}

export function serializeRedirects(rows) {
  return Array.isArray(rows) ? rows.map(serializeRedirect) : []
}
