# Public Website Integration

Milestone 11 prepares the public-site integration without editing a separate public website repository yet.

For the full WordPress REST to Supabase frontend cutover process, route mapping, caching, revalidation, SEO, public-file, and rollout checklist, read [Frontend WordPress-to-Supabase Migration](../FRONTEND_WORDPRESS_TO_SUPABASE_MIGRATION.md).

The admin CMS remains a separate app. Public websites must use Supabase anon credentials and public RPCs only. They must never call `/api/cms/...`, use the Supabase service-role key, upload/delete/list storage objects, or read admin-only tables.

## Local SEO And Redirect Lookup Follow-up (2026-07-16)

The local server-side helper module should preserve generated metadata defaults, then apply populated CMS `canonicalUrl`, `robotsMeta`, and `ogImage` values. Resolve `{date}` in the Home H1 and daily quiz H2 with the current Karachi date. Use the Karachi date six hours ahead only in Home SEO text, WebPage JSON-LD, and the Home sitemap freshness timestamp; the 6:00 PM-to-midnight PKT mismatch is intentional.

Apply `202607160002_home_visible_date_tokens.sql` once for the selected local website. It changes only the literal dates in those two existing headings to `{date}` and preserves the remaining editor HTML.

For redirect middleware, call `get_public_redirect(domain, from_path)` with anon credentials. It returns one active redirect or `null`; do not load the full redirect inventory during ordinary page requests. Keep API, asset, Next internals, `robots.txt`, `ads.txt`, and sitemap requests outside redirect handling.

## Public Website Env

Add these to each public website deployment:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
CMS_REVALIDATION_SECRET=
```

`CMS_REVALIDATION_SECRET` must match the website-level revalidation secret saved in the admin CMS settings for that website.

## Public Data Client

Use a local server-side helper module in the public website, for example `lib/cms/`. The public site must not depend on a bare `cms-core/public-cms` import because that package path is not published as a public-app runtime dependency.

```js
import { getContentIndex, getHomeTemplate, getLatestPosts } from '@/lib/cms'

const home = await getHomeTemplate()
const posts = await getLatestPosts(10)
const sitemapIndex = await getContentIndex()
```

All public reads resolve the active website by domain in Supabase. Inactive websites, import jobs, and revalidation secrets are not returned.

Individual post URLs should use the live WordPress-style category path:

```text
/{categorySlug}/{postSlug}
```

The public route should parse the final post slug from that URL before calling `getPost(domain, postSlug)`. `/blog` is the archive/list page only, not the prefix for every post.

## Images

Public RPCs return resolved image objects:

```json
{
  "url": "https://project.supabase.co/storage/v1/object/public/cms-media/...",
  "alt": "Image alt",
  "caption": null,
  "width": 1200,
  "height": 800
}
```

The public website renders these URLs directly in `<img>` or framework image components. The browser downloads from Supabase Storage public URLs/CDN. Public websites do not list, upload, delete, or mutate storage objects.

## AdSense

Use the safe AdSense settings returned from `get_public_site_settings`.

```js
if (settings.adsense?.enabled) {
  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${settings.adsense.publisherId}`
}
```

Render the AdSense script only when `enabled` is true and `publisherId` starts with `ca-pub-`.

## `/ads.txt`

Example App Router route for the public website:

```js
import { getSiteSettings } from '@/lib/cms'

export async function GET(request) {
  const settings = await getSiteSettings()
  const adsTxt = settings?.adsense?.adsTxt

  if (!adsTxt) return new Response('Not found', { status: 404 })

  return new Response(adsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
```

## Revalidation Endpoint

Each public website should expose a server-only endpoint that the admin CMS can call after public-facing changes.

```js
import { normalizeCmsRevalidationPayload, verifyCmsRevalidationSecret } from '@/lib/cms/revalidation'
import { revalidatePath } from 'next/cache'

export async function POST(request) {
  if (!verifyCmsRevalidationSecret(request, process.env.CMS_REVALIDATION_SECRET)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = normalizeCmsRevalidationPayload(await request.json())
  const paths = payload.paths.length > 0 ? payload.paths : ['/', '/blog', '/sitemap.xml']

  for (const path of paths) {
    revalidatePath(path)
  }

  return Response.json({ revalidated: true, paths, event: payload.event })
}
```

Webhook failure must be visible in the admin CMS response but must not roll back the saved content.

## Redirects

Public websites should call `listRedirects(domain)` or the equivalent helper early in request handling/middleware. Only active redirects are returned.

V1 public websites must not update `hit_count` or `last_hit_at` with anon credentials.

## Global Quiz

Quiz is global and is not resolved by website domain.

```js
const quiz = await cms.getCurrentQuiz()
```

The helper calls `cms_public_get_current_quiz()` with Supabase anon credentials. It returns only the latest published quiz from `cms_global_quiz`.

### Quiz publication revalidation

The Admin CMS saves the global quiz first, then calls the configured
revalidation webhook for every active website. The event is
`global_quiz.updated` and invalidates `/`, `/page-sitemap.xml`, and
`/sitemap_index.xml`. A failing or missing website webhook is returned in the
admin response without undoing the successfully saved quiz.

For the Telenor production frontend, configure the website webhook as
`https://telenorquiztoday.com.pk/api/revalidate` and use the same secret as
the frontend's server-only `CMS_REVALIDATION_SECRET`.

## Implemented Reference Site

The reference frontend repository implements the local helper pattern in `lib/cms/`, including domain resolution, five-minute domain-scoped caching, public RPC adapters, revalidation, redirects, images, sitemap, robots, ads.txt, AdSense, and global quiz rendering. Treat it as the reference implementation, not as a package dependency.

## Homepage and Sidebar Post Display

Use the existing newest-first public post result as a 30-post candidate pool. The homepage should pass the full pool to a client component, which keeps the newest two posts in the first two Latest News cards and selects four unique cards from the remaining pool only after hydration; this avoids a server/client hydration mismatch and produces a new lower-four selection on a full browser refresh.

The sidebar must preserve the first five records as exact newest-first **Recent Posts**. Its **Popular Posts** section selects five unique records from the remaining pool, never repeats a Recent Post, and is a rotating recent-post list rather than analytics-based popularity. Do not change archive ordering: Blog and category pages preserve the public RPC's `published_at DESC, created_at DESC` order.

## Publication Date Contract

`published_at` means the original publication date, not the latest edit date and not the WordPress migration time. The public website must keep the ordered public RPC result unchanged. This makes site-wide Latest News, Recent Posts, Popular Posts, Blog, and category archives consistently show the true newest post first.

## Post-card Reading Time

`list_public_posts_page` returns `readingTimeMinutes` for every card. Use that value for Blog, category, search, Home, and sidebar card labels because list results intentionally omit full article HTML. The value is calculated server-side from the saved CMS post body at 200 words per minute; public post-detail pages may still calculate from their already-loaded body content as a fallback.

## Custom CMS Pages

Treat a custom CMS Page as a website page, not a blog post. The reference frontend renders it with the shared legal-page layout: breadcrumb, H1, sanitized CMS body, and last-updated date. Do not render post author/meta, a featured image, table of contents, ads, sharing controls, or a sidebar for this route.

Leave Canonical URL override empty for the frontend to generate the complete canonical from its configured public origin and Page path; save an override only for a deliberate canonical change. The editor does not show a generated-canonical preview.

## Canonical URLs and Robots Defaults

## Production origin, schema, and performance hardening

The Telenor reference frontend uses `https://telenorquiztoday.com.pk` as its one public origin. `CMS_SITE_DOMAIN` only selects CMS content during local and preview requests; it is not a public URL source. Canonical metadata, JSON-LD, breadcrumbs, robots, sitemap indexes, and child sitemaps must all use the configured public origin.

The public CMS adapter keeps the five-minute fetch cache and adds `React.cache()` wrappers for singular post, page/template, Home, settings, category, author, and content-index reads so `generateMetadata()` and its page renderer reuse the same resource during a server render. Existing RPC contracts remain unchanged.

The public schema uses absolute URLs for the Organization and Article publisher logo. The frontend sets `Referrer-Policy: strict-origin-when-cross-origin` and a restrictive `Permissions-Policy`. `CSP_REPORT_ONLY=true` enables staging-only report-only CSP testing; it is deliberately off by default and is not an enforced policy.

Run this read-only image audit with the same public frontend environment before release:

```powershell
node --env-file=.env.local scripts/audit-cms-media.mjs --strict
```

It checks public sitemap-indexed template, Page, and post images for width and height metadata and exits non-zero only with `--strict` when missing dimensions are found.

### Final local validation snapshot (2026-07-18)

Frontend tests passed 79 of 79, lint passed, and Admin CMS documentation readiness passed 13 of 13. Local route checks confirmed Home, Blog, a post, fixed pages, category archives, author archive, and Editorial Policy each return `200`, a production-origin canonical, `index,follow`, and one H1. The media audit checked 114 image-bearing public resources with zero missing dimensions.

The active local dev server did not finish a full sitemap crawl within two minutes. Run that complete crawl after a production build or from staging; this does not indicate a known public-route failure.

## Canonical URLs and Robots Defaults

Public frontends must emit a canonical URL for each public route. When the CMS `canonicalUrl` is empty, generate it from the public website URL and current route; treat a non-empty CMS value as an explicit override.

Posts, custom pages, and fixed templates use `index,follow` as their CMS default. `202607170002_default_index_follow_robots.sql` updates only null/blank `robots_meta` values on all CMS websites, preserving intentional robots directives and every canonical override.

Reference frontends should permanently redirect legacy aliases to their fixed canonical paths and must not render a non-functional contact form.
