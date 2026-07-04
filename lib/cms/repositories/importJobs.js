import { encryptSecret } from '../crypto/secrets.js'
import { serializeImportJob, serializeImportJobs } from '../serializers/importJobs.js'
import { supabaseAdminRequest } from '../../supabase/adminRest.js'

const IMPORT_JOB_SELECT =
  'id,website_id,source_type,source_url,status,started_at,finished_at,temporary_credentials_encrypted,report,error_message,created_at,updated_at'

export async function listImportJobs(websiteId) {
  const rows = await supabaseAdminRequest(
    `cms_import_jobs?select=${IMPORT_JOB_SELECT}&website_id=eq.${encodeURIComponent(websiteId)}&order=created_at.desc`
  )

  return serializeImportJobs(rows)
}

export async function getImportJob(websiteId, jobId) {
  const rows = await supabaseAdminRequest(
    `cms_import_jobs?select=${IMPORT_JOB_SELECT}&website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(jobId)}&limit=1`
  )

  return serializeImportJob(rows?.[0])
}

export async function createImportJob({
  websiteId,
  sourceUrl,
  temporaryCredentials,
}) {
  const rows = await supabaseAdminRequest('cms_import_jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: {
      website_id: websiteId,
      source_type: 'wordpress',
      source_url: sourceUrl,
      status: 'queued',
      report: {},
      temporary_credentials_encrypted: temporaryCredentials
        ? encryptSecret(JSON.stringify(temporaryCredentials))
        : null,
    },
  })

  return serializeImportJob(rows?.[0])
}

export async function updateImportJob(websiteId, jobId, payload) {
  const row = {}

  if (Object.hasOwn(payload, 'status')) row.status = payload.status
  if (Object.hasOwn(payload, 'startedAt')) row.started_at = payload.startedAt
  if (Object.hasOwn(payload, 'finishedAt')) row.finished_at = payload.finishedAt
  if (Object.hasOwn(payload, 'report')) row.report = payload.report
  if (Object.hasOwn(payload, 'errorMessage')) row.error_message = payload.errorMessage
  if (payload.clearTemporaryCredentials) row.temporary_credentials_encrypted = null

  const rows = await supabaseAdminRequest(
    `cms_import_jobs?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(jobId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: row,
    }
  )

  return serializeImportJob(rows?.[0])
}
