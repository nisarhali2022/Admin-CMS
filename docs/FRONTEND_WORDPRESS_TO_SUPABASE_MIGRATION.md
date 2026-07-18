# Frontend WordPress-to-Supabase Migration

## Purpose

Use this guide when moving a separate visitor-facing Next.js website from WordPress REST API reads to the CMS data stored in Supabase.

After cutover:

- WordPress is only a historical content-import source.
- Supabase is the only live frontend content source.
- The frontend keeps its existing theme, layout, components, and public URLs.
- The CMS manages content; the public Next.js app renders it.
- A rollback means redeploying the prior frontend release. Do not add a live WordPress fallback path.

## Local SEO And Performance Follow-up (2026-07-16)

- Resolve `{date}` in the manual Home H1 and daily quiz H2 with the current Karachi date before extracting the quiz heading and table of contents. Do not rewrite the remaining editor content.
- Use the Karachi date six hours ahead only for Home metadata, Open Graph/Twitter metadata, WebPage JSON-LD, and the Home sitemap freshness timestamp. From 6:00 PM until midnight PKT, this intentionally differs from the visible H1/H2 date.
- Apply `202607160002_home_visible_date_tokens.sql` once for `test.telenorquiztoday.com.pk`; it replaces only the existing literal dates in those two headings with `{date}`.
- Pass saved CMS canonical URL, robots meta, and OG image into Next.js metadata only when present; otherwise use the normal generated values.
- Generate sitemaps from canonical fixed paths only. Exclude redirect aliases, `/telenor-quiz-today`, and `/404-page`.
- Use `get_public_redirect(domain, from_path)` in middleware for one exact anon-safe redirect lookup. Retain `list_public_redirects` only for compatibility.
- Keep `next/image`, AVIF/WebP, lazy content images, `next/font`, and lazy analytics/AdSense loading. Real Core Web Vitals need a deployed URL and are not measured from local development.

This guide applies to each public website independently. The Admin CMS and `setup-provisioning/` app are not the visitor-facing website and must not be used as public content APIs.

## Architecture And Security Boundary

```text
WordPress REST API --one-time import--> setup-provisioning --> Supabase
                                                           |
                                                           v
Public Next.js website --> local lib/cms helpers --> Supabase public RPCs
                                                           |
                                                           v
                                                Supabase Storage public images
```

The frontend must use only the public RPC contract through local server-side helpers under `lib/cms/`.

Do:

- use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- render data through server components by default for SEO and performance;
- resolve the current active website by the request domain;
- use the returned public image URLs directly;
- expose a server-only revalidation endpoint for the CMS.

Do not:

- expose `SUPABASE_SERVICE_ROLE_KEY`, `CMS_ENCRYPTION_KEY`, admin secrets, or database credentials;
- call `/api/cms/...` from the public website;
- query `cms_*` tables directly from the browser or public app;
- upload, delete, or list Supabase Storage objects from the public frontend;
- keep WordPress REST calls, WordPress image hosts, or WordPress runtime credentials after cutover.

For legacy fixed-page URLs, import `/about-us`, `/contact-us`, and `/privacy-policy` into the matching fixed template records, rather than as custom pages. The frontend resolves these URLs through `about`, `contact`, and `privacy` templates.

CMS content is publish-only: Posts, Pages, and Templates do not have an editable or hidden draft status. For an older database where later public RPCs reintroduced draft filters, apply `202607150003_reconcile_publish_only_content.sql` and verify public post and sitemap data after restarting the frontend.

Use the resolved CMS request domain for every sitemap entry, including fixed archive URLs such as `/blog`; do not build one sitemap URL from a hard-coded production host.

## Before Changing The Frontend

### 1. Confirm The Supabase Website Is Ready

In setup/provisioning, confirm that the website record is active only after import review is complete. For the selected domain, verify:

- expected counts for posts, Pages, categories, authors, and media;
- author names, bios, and avatars;
- Yoast-imported focus keyphrases, SEO titles, and meta descriptions;
- featured images and inline editor images;
- imported internal links now point to relative CMS paths;
- redirects, site settings, robots/sitemap settings, AdSense settings, and global quiz data;
- a sample of WordPress URLs, especially home, fixed pages, custom pages, blog archive, category pages, and post details.

The WordPress importer is intentionally relaxed for missing SEO/image data. That does not remove the need to review important live pages before activating the website.

### 2. Inventory The Existing WordPress Frontend Integration

In the public Next.js repository, find and list every use of:

- WordPress REST endpoints such as `/wp-json/wp/v2/posts`, `/pages`, `/categories`, `/users`, or custom API routes;
- WordPress base URL environment variables;
- WordPress image URLs and `next.config` image domains;
- SEO helpers that read Yoast HTML or WordPress REST metadata;
- sitemap, robots, ads.txt, redirect, quiz, and navigation data sources;
- browser-side fetches that call WordPress directly;
- routes that depend on WordPress page IDs, category IDs, slugs, pagination headers, or HTML fields.

Make a route-by-route baseline in staging: URL, title, canonical URL, description, robots value, visible content, images, redirect behavior, and HTTP status. This is the comparison set for the direct switch.

## Frontend Environment

Add these variables to the public website deployment and local environment:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
CMS_REVALIDATION_SECRET=the-secret-configured-for-this-website
CMS_SITE_DOMAIN=example.com
```

`CMS_SITE_DOMAIN` is server-only and is recommended for local development and preview deployments, where `localhost` or a preview hostname is not a domain in `cms_website_domains`.

Use the real request host in production. Strip protocol, port, path, and a leading `www.` only if that matches the domain stored in Supabase. Keep domain normalization in one frontend helper so every route resolves the same website.

## Public CMS Client

Use a local server-side frontend module, for example `lib/cms/index.js`. Do not use a bare `cms-core/public-cms` import in the public app:

```js
export { getHomeTemplate, getPosts, getSiteSettings } from './index.js'
```

The client uses Supabase REST RPC calls and returns only public-safe data for active websites. It does not expose admin-only fields, import jobs, revalidation secrets, or storage management operations.

Prefer server components, route handlers, `generateMetadata`, `sitemap`, and `robots` functions for CMS reads. Client components should receive already-fetched data as props unless interactive public behavior genuinely requires a browser RPC call.

### Caching And Revalidation

The shared client intentionally uses `cache: 'no-store'` for its underlying RPC fetch. In a public Next.js app, wrap repeated server-side reads in a frontend cache facade such as `unstable_cache`, keyed by domain and route input, with a conservative time-based fallback such as 300 seconds.

Use the CMS revalidation webhook for immediate refresh after content edits. The public site endpoint verifies `x-cms-revalidation-secret`, normalizes the payload with `normalizeRevalidationPayload`, and calls `revalidatePath` for each requested path.

Do not cache by only slug or only path. Include the resolved domain in every cache key because all websites use the same Supabase project.

## WordPress-To-Supabase Data Mapping

| Previous frontend need | Supabase public read | Frontend result |
|---|---|---|
| Site identity/domain state | `getSiteByDomain(domain)` | Verify the active website and obtain safe website data. |
| Home and fixed templates | `getTemplateContent(domain, templateKey)` | Render the existing fixed frontend layout with CMS content. |
| Custom Pages | `getPage(domain, path)` | Render published custom Page HTML and SEO data. |
| Blog archive, category archive, search | `listPosts(domain, { categorySlug, search, limit, offset })` | Render cards/list items and pagination. |
| Blog detail | `getPost(domain, slug)` | Render the fixed post layout, author, category, image, HTML, and SEO data. |
| Categories | `listCategories(domain)` | Render category navigation and archive links. |
| Authors | `listAuthors(domain)` | Render author navigation/profile sections when the site uses them. |
| Site settings | `getSiteSettings(domain)` | Generate site defaults, robots, sitemap, AdSense, and ads.txt. |
| Redirect rules | `listRedirects(domain)` | Redirect matching source paths before page rendering. |
| Daily quiz | `getCurrentQuiz()` | Render the global quiz; it has no website/domain scope. |

The current public RPC input and output shapes are owned by [API_CONTRACTS.md](API_CONTRACTS.md). Reuse the local helper instead of duplicating raw RPC URLs in page components.

## App Router Route Migration

Keep existing public URLs unchanged unless the CMS import explicitly maps a different final URL.

### Home And Fixed Pages

The frontend owns the layout for fixed templates. Fetch template content by key and place values into existing components rather than rendering a page builder.

```js
const home = await publicCms.getTemplateContent(domain, 'home')
```

Known fixed template keys are `home`, `about`, `contact`, `privacy`, `terms`, and `packages`. The public website should maintain its per-site mapping from a route to a template key. If an admin changes a fixed template path, update that frontend route mapping before deployment.

### Custom Pages

For a custom route such as `/guides`, call:

```js
const page = await publicCms.getPage(domain, '/guides')
```

Normalize inputs to a leading-slash path and return `notFound()` when the RPC returns no published Page. Render `bodyHtml` only from this public CMS response; do not combine it with raw WordPress HTML.

### Blog Archive, Category, And Search

`/blog` remains the blog archive route. Use `listPosts` with the selected category slug, search text, page size, and calculated offset.

```js
const limit = 20
const offset = (pageNumber - 1) * limit
const posts = await publicCms.listPosts(domain, {
  categorySlug: selectedCategory || null,
  search: searchText || null,
  limit,
  offset,
})
```

The current contract returns a list. The frontend should treat a short final list as the end of pagination. Do not depend on WordPress `X-WP-Total` headers.

### Post Detail Routes

Individual posts use the live URL structure:

```text
/{categorySlug}/{postSlug}
```

For a route such as `/telecom/example-post`, call `getPost(domain, 'example-post')`, then verify that `post.category.slug === 'telecom'`. Return `notFound()` or redirect to the canonical category path when it does not match. This keeps a copied or incorrect category URL from rendering the post under the wrong path.

`/blog/{postSlug}` is not a post-detail URL in this CMS.

## Rendering Content And Media

Public RPCs resolve CMS media references to objects such as:

```json
{
  "url": "https://project.supabase.co/storage/v1/object/public/cms-media/websites/.../image.webp",
  "alt": "Descriptive alternative text",
  "caption": null,
  "width": 1200,
  "height": 800
}
```

Use these values in `<img>` or in `next/image` after configuring the Supabase host in `images.remotePatterns`. Never build public image URLs from `storagePath` in the frontend.

For rich post/custom Page content:

- prefer `bodyHtml` when present;
- retain `bodyBlocks` only as legacy/import fallback;
- render only CMS-sanitized public content;
- apply responsive content CSS such as `img { max-width: 100%; height: auto; }`;
- keep link, heading, table, list, image, and YouTube rendering compatible with the Tiptap HTML contract;
- never reintroduce untrusted raw WordPress HTML or client-side WordPress content transforms.

## SEO, Public Files, Ads, Redirects, And Quiz

### Metadata

Implement `generateMetadata` for every content route using the public result:

- title: `seo.title`, then the content title, then a site default;
- description: `seo.metaDescription`, then a safe site default;
- canonical: `seo.canonicalUrl`, otherwise build from the request domain and normalized path;
- robots: `seo.robotsMeta`, otherwise the safe site default;
- Open Graph image: returned OG image when available, otherwise the feature image;
- article author, category, and publish date for posts.

Do not scrape WordPress Yoast HTML at runtime. Imported Yoast values are already stored in Supabase.

### Robots And Sitemap

Build `/robots.txt` from safe site settings. Build sitemaps with `list_public_content_index(domain)` after collecting the site's published templates, custom Pages, posts, categories, and authors.

Current public contract checkpoint: it fetches individual template/custom Page records but does not provide a public list RPC for all templates or all custom Pages. For a complete sitemap, choose one of these before cutover:

1. Maintain the known fixed-template and custom Page paths in the frontend configuration for that website.
2. Add public list RPCs for templates/custom Pages to the CMS contract, then update the shared client and this guide's implementation.

Do not ship a sitemap that silently omits custom Pages.

### AdSense And `ads.txt`

Read safe AdSense settings through the local `getSiteSettings()` helper. Render only its safe `adsense` fields.

- Render the AdSense script only when `enabled` is true and `publisherId` is valid.
- Return `404` for `/ads.txt` when AdSense is inactive or no ads.txt text exists.
- Never place AdSense configuration in the frontend environment file.

### Redirects

Resolve active CMS redirects before page rendering. If using `middleware.ts`, make the request edge-compatible and call only `listRedirects(domain)` with anon credentials. Preserve the configured status code: 301 or 302.

Do not update redirect hit counts from the public frontend in v1.

### Global Quiz

Call `getCurrentQuiz()` without a website domain. Render it in each website's existing quiz/homepage component only when the returned quiz is published and complete. Do not store a separate copy of quiz data in the frontend.

## Revalidation Endpoint

Add a server-only route such as `app/api/revalidate/route.js` to every public website. It must:

1. Read `CMS_REVALIDATION_SECRET` on the server.
2. Verify the request with `verifyRevalidationSecret`.
3. Normalize the payload with `normalizeRevalidationPayload`.
4. Revalidate each supplied path with `revalidatePath`.
5. Return a small JSON success/failure response.

The admin CMS uses this endpoint after public-facing changes. A webhook failure should be visible to the admin but must not roll back the saved CMS record.

## Direct Cutover Procedure

### Staging Verification

1. Deploy the Supabase-backed frontend to staging with the same domain configuration as production.
2. Compare the baseline URLs against the live WordPress site:
   - HTTP status and redirect chain;
   - content and links;
   - page/post/category URLs;
   - images and alt text;
   - metadata, canonical tags, robots, and Open Graph image;
   - sitemap, robots.txt, ads.txt, AdSense, and quiz;
   - pagination and search;
   - mobile layout and Core Web Vitals.
3. Confirm browser network requests contain Supabase public RPC calls only, never WordPress REST URLs.
4. Save a content change in the CMS and confirm the affected staging path revalidates.

### Production Deployment

1. Confirm the Supabase website is active and imported data has been reviewed.
2. Remove WordPress API helpers, environment variables, image domains, fallback code, and runtime fetches from the frontend branch.
3. Deploy the Supabase-only frontend.
4. Smoke-test home, fixed pages, custom Pages, blog archive, category archive, post detail, media, metadata, redirect, sitemap, robots, ads.txt, AdSense, and quiz routes.
5. Monitor application errors, Supabase RPC failures, image requests, and search-console crawl issues immediately after deployment.

### Rollback

If a critical rendering, SEO, or routing issue is found, redeploy the prior WordPress-backed frontend release. Do not introduce a runtime source switch or read both systems in production. Fix the Supabase integration in staging, verify it, then deploy again.

## Completion Checklist

- [ ] No frontend WordPress REST API calls remain.
- [ ] No WordPress runtime environment variables or credentials remain.
- [ ] All public reads use local `lib/cms/` helpers and public Supabase RPCs.
- [ ] The public frontend never receives service-role credentials.
- [ ] The website resolves content by its active Supabase domain record.
- [ ] Fixed templates, custom Pages, posts, categories, authors, images, redirects, settings, and quiz render correctly.
- [ ] Post URLs use `/{categorySlug}/{postSlug}` and validate the returned category.
- [ ] Metadata, canonical URLs, robots, Open Graph images, sitemap, robots.txt, ads.txt, and AdSense work.
- [ ] Media uses resolved Supabase Storage URLs and never lists Storage objects publicly.
- [ ] Revalidation succeeds after representative CMS edits.
- [ ] Custom Page sitemap coverage is explicitly solved.
- [ ] A tested previous deployment is available for rollback.

## Related Documents

- [Public Website Integration](public-site-integration/README.md)
- [API Contracts](API_CONTRACTS.md)
- [Architecture](ARCHITECTURE.md)
- [RLS Policies](RLS_POLICIES.md)
- [Setup](SETUP.md)

## 2026-07-16 Homepage rendering note

### Local domain behavior

Set `CMS_SITE_DOMAIN` only in local or preview environment files. The public helper and redirect middleware use it for `localhost`, `127.0.0.1`, IPv6 loopback, and `.vercel.app` preview hosts. On a real custom domain, the request host selects the Supabase website record.

The Home template's rich text remains manually authored in the CMS page editor. The public frontend renders it in this fixed order:

1. Manual introduction.
2. Collapsible Table of Contents generated from H1–H4 editor headings.
3. The manual `Today Telenor Answer...` heading.
4. The daily card set from the separate global Quiz CMS.
5. Six Supabase-backed Latest News cards.
6. The remaining manual Home content.

### Homepage and sidebar post selection

The reference frontend obtains the 30 newest published posts using the existing public post RPC order (`published_at` descending, then `created_at` descending). It uses that cached pool as follows:

1. **Latest News** keeps the two newest posts in cards 1 and 2, then selects four unique posts from the remaining newest-30 pool in the browser after each full homepage refresh.
2. **Recent Posts** shows the first five posts in exact newest-first order in the sidebar.
3. **Popular Posts** selects five unique posts from the remaining newest-30 pool, so it cannot repeat Recent Posts. The label is a display name only; it is not analytics-based popularity.

Blog and category archive pages continue to render the RPC order unchanged, so Blog, Telenor, Telecom, Global, and Tech begin with their most recently published post.

### Reading-time labels on cards

The paginated public post RPC intentionally omits full article HTML so archive and widget requests stay lightweight. It instead returns `readingTimeMinutes`, calculated from saved CMS post content at 200 words per minute. Use that value for every Blog, category, search, Home, and sidebar post-card label. Keep the client-side word-count helper only as a fallback for a full post-detail result or an older CMS response.

### Preserving original WordPress publication dates

The public post RPC orders by `published_at DESC` and then `created_at DESC`. A WordPress import must therefore preserve each source post's `date_gmt` (falling back to `date`) in `cms_posts.published_at`. New CMS posts use their creation time; an edit of an existing CMS post preserves its original publication date.

For an earlier import that used import-time dates, run the safe repair utility from the Admin CMS root:

```powershell
node --env-file=.env.local setup-provisioning/scripts/repair-wordpress-post-dates.mjs --domain test.telenorquiztoday.com.pk --wordpress-url https://wp.telenorquiztoday.com.pk
node --env-file=.env.local setup-provisioning/scripts/repair-wordpress-post-dates.mjs --domain test.telenorquiztoday.com.pk --wordpress-url https://wp.telenorquiztoday.com.pk --apply
```

The first command is read-only. The `--apply` command updates only matching post slugs and only their publication timestamps, then requests public revalidation for Home, Blog, and affected category archives.

### Custom CMS Pages and optional canonical overrides

Custom CMS Pages are informational website pages, not posts. Render them with the same full-width legal-page presentation used by Privacy Policy: breadcrumb, H1, sanitized CMS HTML, and a last-updated date. Do not add Article metadata, author/meta, featured image, table of contents, ads, sharing controls, or a sidebar to that branch.

Keep category archives and post detail routes separate so their existing presentations remain unchanged. When the CMS Canonical URL override is empty, generate the public canonical from the frontend's configured site origin and the custom Page route. A populated canonical field is an intentional override only.

### Contact, legal pages, canonical URLs, and robots defaults

### Production public origin and technical hardening

For this reference site, `https://telenorquiztoday.com.pk` is the only public SEO origin. Keep `CMS_SITE_DOMAIN=test.telenorquiztoday.com.pk` for local CMS lookup only; it must never appear in canonical tags, JSON-LD, `robots.txt`, sitemap indexes, or child sitemaps.

Use the frontend `SITE_CONFIG.siteUrl` for every crawler-facing URL. Public Supabase RPCs continue resolving content from `CMS_SITE_DOMAIN`. Organization and Article publisher logos in JSON-LD must be absolute URLs.

The frontend caches singular domain-scoped public reads with `React.cache()` for one server render and keeps the existing five-minute Next fetch cache. Redirect middleware intentionally retains the exact public redirect RPC and excludes APIs, static files, sitemap routes, `robots.txt`, and `ads.txt` before lookup.

For staging CSP observation only, set `CSP_REPORT_ONLY=true` at build time. This adds a report-only policy for the site, Supabase, Google Analytics, and AdSense; do not enforce it until staging checks show no required source is blocked.

#### Final local validation snapshot (2026-07-18)

- Frontend regression tests passed: 79 of 79.
- Lint, documentation readiness, and `git diff --check` passed; line-ending notices are informational only.
- Local checks confirmed Home, Blog, a post, fixed pages, category archives, author archive, and Editorial Policy each return `200`, one H1, `index,follow`, and a production-origin canonical URL.
- The read-only public media audit checked 114 image-bearing resources and found zero missing width/height values.
- A complete sitemap crawl should run after a production build or on staging. The local dev server did not complete every route within the two-minute safe limit.

### Production cutover handoff

Deploy the Telenor reference frontend from `nisarhali2022/telenor-quiz-today`
branch `master` to `https://telenorquiztoday.com.pk`, with `www` permanently
redirecting to the root domain. Rename the tested CMS website domain from
`test.telenorquiztoday.com.pk` to `telenorquiztoday.com.pk`, retain its
content, and save `https://telenorquiztoday.com.pk/api/revalidate` as its
website webhook.

Vercel Production requires `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CMS_SITE_DOMAIN`,
`CMS_REVALIDATION_SECRET`, and `CRON_SECRET`. The public frontend receives no
service-role credential and has no WordPress runtime environment variable. A
global Quiz save revalidates every active configured website's Home, page
sitemap, and sitemap index.

### Contact, legal pages, canonical URLs, and robots defaults

- The public Contact page is informational only. It keeps CMS body content and the published contact details, but does not display a form that cannot deliver messages.
- The former **Related pages** navigation is removed from every public page.
- `/privacy-policy`, `/terms-of-service`, and `/disclaimer` use the same CMS-backed legal-page presentation. `/privacy` permanently redirects to `/privacy-policy`.
- Public metadata always includes a generated canonical URL when the CMS Canonical URL override is blank. The override is only for intentional canonical changes.
- New Posts, custom Pages, and fixed Templates save `index,follow` by default. The migration `202607170002_default_index_follow_robots.sql` brings existing blank values to the same default across all CMS websites without overwriting explicit choices; historic reserved-page rows such as `/blog` are skipped and should be removed or renamed.

The homepage renderer applies its own responsive H1–H4 scale, body copy, link, list, image, and table styling. Editors should use semantic headings instead of inline font-size overrides. If imported legacy content begins with an extra `Latest News` heading and its Explore link, that duplicate is suppressed in public rendering only; the CMS editor record is not changed.
