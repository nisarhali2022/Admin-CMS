/*
 * Creates or clears the fixed Home template for one website. It is dry-run by
 * default and may only write when --apply is supplied. Run it against an
 * inactive website first, then verify the intentionally empty public homepage
 * before activating that website.
 */

const apply = process.argv.includes('--apply')
const supabaseUrl = String(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
).replace(/\/$/, '')
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const domain = String(process.env.CMS_SITE_DOMAIN || '').trim().toLowerCase()

if (!supabaseUrl || !serviceRoleKey || !domain) {
  throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and CMS_SITE_DOMAIN are required.')
}

const baseContentData = {
  heroTitle: '',
  heroText: '',
  ctaLabel: '',
  ctaHref: '',
  heroImage: { mediaId: null },
  introHtml: '',
  latestNewsTitle: '',
  quizHeadingTemplate: '',
  quizInfoSections: [],
  conclusionHeading: '',
  conclusionHtml: '',
  stepsHeading: '',
  steps: [],
  faqHeading: '',
  faqs: [],
}

const seoTitle = 'Telenor Quiz Today {date} - Latest My Telenor Answer Today'
const metaDescription = 'Get all correct Telenor Quiz Today {date}. Check daily updated My Telenor answers today to boost your score instantly and win exciting rewards.'

async function request(path, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!response.ok) throw new Error(`${path} failed with ${response.status}: ${await response.text()}`)
  return response.status === 204 ? null : response.json()
}

const websites = await request(`cms_websites?select=id,primary_domain,is_active&primary_domain=eq.${encodeURIComponent(domain)}&limit=1`)
const website = websites?.[0]
if (!website) throw new Error(`No CMS website exists for ${domain}.`)

const templateRows = await request(`cms_template_content?select=id,content_data&website_id=eq.${website.id}&template_key=eq.home&limit=1`)
const template = templateRows?.[0]

const authors = await request(`cms_authors?select=id&website_id=eq.${website.id}&is_active=is.true&limit=1`)
const author = authors?.[0]
if (!author) throw new Error(`No active CMS author exists for ${domain}. Create or import an author before seeding the Home template.`)

const featuredPosts = await request(`cms_posts?select=featured_image_id&website_id=eq.${website.id}&featured_image_id=not.is.null&order=published_at.desc&limit=1`)
const featuredImageId = featuredPosts?.[0]?.featured_image_id
if (!featuredImageId) {
  throw new Error(`No post featured image exists for ${domain}. Import media and posts before seeding the Home template.`)
}

const contentData = {
  ...baseContentData,
  heroImage: { mediaId: featuredImageId },
}

const templatePayload = {
  path: '/',
  title: 'Home',
  content_data: contentData,
  focus_keyphrase: 'Telenor Quiz Today',
  seo_title: seoTitle,
  meta_description: metaDescription,
  author_id: author.id,
  canonical_url: '/',
  robots_meta: 'index,follow',
  og_image_id: featuredImageId,
  sitemap_include: true,
  published_at: new Date().toISOString(),
}

console.log(JSON.stringify({
  domain,
  websiteId: website.id,
  active: website.is_active,
  templateId: template?.id || null,
  willCreateTemplate: !template,
  authorId: author.id,
  featuredImageId,
  apply,
  contentData,
}, null, 2))
if (!apply) {
  console.log('Dry run only. Review the payload, then rerun with --apply while the selected website is inactive.')
  process.exit(0)
}
if (website.is_active) throw new Error('Refusing to seed an active website. Seed staging/inactive content first.')

if (template) {
  await request(`cms_template_content?website_id=eq.${website.id}&id=eq.${template.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(templatePayload),
  })
  console.log('Existing Home template content seeded successfully.')
} else {
  await request('cms_template_content', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ website_id: website.id, template_key: 'home', ...templatePayload }),
  })
  console.log('Home template created and seeded successfully.')
}
