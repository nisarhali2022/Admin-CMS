/*
 * Repairs publication dates on existing imported posts. It is read-only until
 * --apply is supplied, and it only changes cms_posts.published_at for CMS
 * posts whose slug exists in the declared WordPress source.
 */

import { repairWordPressPostPublicationDates } from 'cms-core/cms/services/publicationDates'
import { supabaseAdminRequest } from 'cms-core/supabase/adminRest'

function valueForFlag(flag) {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? String(process.argv[index + 1] || '').trim() : ''
}

const apply = process.argv.includes('--apply')
const domain = (valueForFlag('--domain') || process.env.CMS_SITE_DOMAIN || '')
  .toLowerCase()
  .replace(/^https?:\/\//, '')
  .replace(/\/.*$/, '')
  .trim()
const wordpressBaseUrl = valueForFlag('--wordpress-url').replace(/\/$/, '')

if (!domain || !wordpressBaseUrl) {
  throw new Error('Use --domain <CMS domain> and --wordpress-url <WordPress source URL>.')
}

const websites = await supabaseAdminRequest(
  `cms_websites?select=id,primary_domain&primary_domain=eq.${encodeURIComponent(domain)}&limit=1`
)
const website = websites?.[0]
if (!website) throw new Error(`No CMS website exists for ${domain}.`)

const report = await repairWordPressPostPublicationDates({
  websiteId: website.id,
  wordpressBaseUrl,
  apply,
})

console.log(JSON.stringify({ domain, ...report }, null, 2))

if (!apply) {
  console.log('Dry run only. Review the report, then rerun the same command with --apply.')
}
