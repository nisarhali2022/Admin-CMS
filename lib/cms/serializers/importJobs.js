export function serializeImportJob(row) {
  if (!row) return null

  return {
    id: row.id,
    websiteId: row.websiteId || row.website_id,
    sourceType: row.sourceType || row.source_type,
    sourceUrl: row.sourceUrl || row.source_url,
    status: row.status,
    startedAt: row.startedAt || row.started_at || null,
    finishedAt: row.finishedAt || row.finished_at || null,
    report: row.report || {},
    errorMessage: row.errorMessage || row.error_message || null,
    hasTemporaryCredentials: Boolean(
      row.temporaryCredentialsEncrypted || row.temporary_credentials_encrypted
    ),
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
  }
}

export function serializeImportJobs(rows) {
  return Array.isArray(rows) ? rows.map(serializeImportJob) : []
}
