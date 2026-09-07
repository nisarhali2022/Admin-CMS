# API Contracts

All admin APIs are Next.js route handlers. All public reads are Supabase RPCs/views called by separate public websites.

## Local SEO And Redirect Lookup Update (2026-07-16)

- `get_public_redirect(domain text, from_path text)` is anon-safe and returns one active redirect as `{ fromPath, toUrl, redirectType }`, or `null` when no exact path matches.
- `list_public_redirects(domain text)` remains available for compatibility, but public middleware should use the exact lookup RPC so it does not download every rule for each request.
- Public content responses already provide optional `canonicalUrl`, `robotsMeta`, and resolved `ogImage` SEO fields. Public frontends must use those fields only when populated; otherwise they must retain their generated canonical, index/follow, and default social-image values.
- `{date}` is supported in Home template rich HTML and Home SEO fields only. It resolves to the Karachi date at public render time.

## Admin API Rules

All `/api/cms/...` routes must:

- require a valid `ADMIN_SECRET` session
- validate JSON or multipart payloads
- require `websiteId` for website-scoped resources
- verify resource ownership before edit/delete
- return structured errors
- never expose Supabase service-role key to browser or public website code
- trigger public revalidation when public rendering changes

Common error shape:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",
  "details": {}
}
```

## Admin Session API

Routes:

- `GET /api/admin/session`
- `POST /api/admin/session`
- `DELETE /api/admin/session`

Behavior:

- `POST` accepts `{ "secret": "..." }` and creates a signed expiry cookie when it matches `ADMIN_SECRET`.
- `GET` returns whether the current request has a valid admin session.
- `DELETE` clears the current browser's admin session cookie.
- Add basic brute-force protection before real deployment, such as short-window rate limiting or temporary lockout.
- Missing required admin environment variables should fail predictably through server-side environment validation.
- V1 signed cookie sessions are stateless. Logout clears the current cookie only; server-side revocation is not included unless a session store is added later.

## Admin Websites

Routes:

- `GET /api/cms/websites`
- `GET /api/cms/websites/:id`

Behavior:

- read existing provisioned websites for CMS selection
- return website details for existing websites
- do not create, update, deactivate, or import websites from the main CMS
- website provisioning belongs to `setup-provisioning/`

## Setup Project Websites

`setup-provisioning/` owns website onboarding routes and shared-database setup behavior:

- add website
- edit website name/domain/status
- deactivate website
- `DELETE /api/cms/websites/:id` for permanent deletion of an inactive website
- create required default rows in `cms_websites`, `cms_website_domains`, and `cms_site_settings`
- run WordPress import and import reset/retry

Website deletion behavior:

- requires the admin session and an existing inactive website;
- deletes all objects under `websites/{website_id}/` in the `cms-media` bucket before database cleanup;
- calls `cms_admin_delete_website(uuid)` to delete website-scoped rows in one transaction;
- deletes posts, pages, templates, authors, categories, media metadata, redirects, import jobs, settings, domains, and finally the website;
- never deletes `cms_global_quiz`;
- returns a retryable error if Storage or database cleanup fails.

## Admin Template Content

Routes:

- `GET /api/cms/template-content?websiteId=...`
- `POST /api/cms/template-content?websiteId=...`
- `GET /api/cms/template-content/:id?websiteId=...`
- `PATCH /api/cms/template-content/:id?websiteId=...`
- `DELETE /api/cms/template-content/:id?websiteId=...`

Save payload:

```json
{
  "templateKey": "about",
  "path": "/about",
  "title": "About Us",
  "contentData": {},
  "focusKeyphrase": "about company",
  "seoTitle": "About Us",
  "metaDescription": "About our company",
  "authorId": "uuid",
  "canonicalUrl": null,
  "robotsMeta": null,
  "ogImageId": null,
  "sitemapInclude": true
}
```

Behavior:

- validate `templateKey` against supported keys
- validate `contentData` against code-defined template schema
- enforce unique `(website_id, template_key)`
- block cross-website media references
- validate `authorId` as an active author for the selected website when provided
- template content does not support future scheduling in v1
- save always publishes; draft, unpublish, trash, and restore routes are not part of the active CMS
- `DELETE` permanently deletes after admin confirmation

## Admin Custom Pages

Routes:

- `GET /api/cms/pages?websiteId=...`
- `POST /api/cms/pages?websiteId=...`
- `GET /api/cms/pages/:id?websiteId=...`
- `PATCH /api/cms/pages/:id?websiteId=...`
- `DELETE /api/cms/pages/:id?websiteId=...`

Save payload:

```json
{
  "title": "About Us",
  "path": "/about-us",
  "bodyText": "Page body",
  "focusKeyphrase": "about company",
  "seoTitle": "About Us",
  "metaDescription": "About our company",
  "authorId": "uuid",
  "canonicalUrl": null,
  "robotsMeta": null,
  "featuredImageId": "uuid",
  "sitemapInclude": true
}
```

Behavior:

- `Add Page` creates custom pages here, not fixed template content rows
- accepts `about-us` or `/about-us` and stores `/about-us`
- reserves `/` for fixed Home template content
- enforces unique `path` per website
- block cross-website author and feature-image references
- save always publishes; `DELETE` permanently deletes after admin confirmation

## Admin Authors

Routes:

- `GET /api/cms/authors?websiteId=...`
- `POST /api/cms/authors?websiteId=...`
- `GET /api/cms/authors/:id?websiteId=...`
- `PATCH /api/cms/authors/:id?websiteId=...`
- `DELETE /api/cms/authors/:id?websiteId=...`

Save payload:

```json
{
  "name": "Author Name",
  "slug": "author-name",
  "bio": "Short author bio",
  "avatarImageId": null,
  "isActive": true
}
```

Behavior:

- authors are website-scoped content records, not login users
- one admin user creates, edits, and permanently deletes authors
- unique author slug within selected website
- same author slug can exist on different websites
- avatar image must belong to the selected website
- inactive authors are not selectable for new posts
- permanent delete is blocked while posts reference the author, unless posts are reassigned first

## Admin Posts

Routes:

- `GET /api/cms/posts?websiteId=...`
- `POST /api/cms/posts?websiteId=...`
- `GET /api/cms/posts/:id?websiteId=...`
- `PATCH /api/cms/posts/:id?websiteId=...`
- `DELETE /api/cms/posts/:id?websiteId=...`

Save payload:

```json
{
  "title": "Post title",
  "slug": "post-title",
  "authorId": "uuid",
  "categoryId": "uuid",
  "featuredImageId": null,
  "bodyHtml": "<p>Post body HTML</p>",
  "bodyBlocks": [],
  "seoTitle": null,
  "metaDescription": null,
  "canonicalUrl": null,
  "robotsMeta": null,
  "ogImageId": null,
  "sitemapInclude": true
}
```

Behavior:

- one website-scoped category is required per post in v1 because category slug is part of the public URL
- one website-scoped author per post in v1
- `bodyHtml` is the preferred body format for new admin edits
- keep `bodyBlocks` for backward compatibility and imported legacy posts
- public/admin serializers return both `bodyHtml` and `bodyBlocks`; public sites should prefer `bodyHtml` when present and fall back to `bodyBlocks`
- block duplicate slug within same website
- allow same slug across different websites
- block cross-website image/category/author references
- editor image HTML stores `data-media-id` and legacy image blocks store `mediaId` as the primary reference
- posts do not support future scheduling in v1
- save always publishes; draft, unpublish, trash, and restore routes are not part of the active CMS
- `DELETE` permanently deletes after admin confirmation

## Admin Media

Routes:

- `GET /api/cms/media?websiteId=...`
- `POST /api/cms/media?websiteId=...`
- `PATCH /api/cms/media/:id?websiteId=...`
- `DELETE /api/cms/media/:id?websiteId=...`
- `GET /api/cms/media/:id/usage?websiteId=...`

Upload payload:

- multipart file
- `altText`
- `caption`

Behavior:

- validate file type and size
- convert/compress to WebP with server-side `sharp`
- upload to `websites/{website_id}/media/{yyyy}/{mm}/{filename}.webp`
- upload with Supabase Storage `cacheControl: '31536000'`
- treat uploaded image objects as immutable; replacing image content creates a new readable filename path with a numeric collision suffix and updates CMS references
- save metadata row
- media picker returns only selected website media
- delete checks usage
- referenced media cannot be deleted
- unused media deletes Supabase Storage object first, then hard deletes the metadata row
- if Supabase Storage deletion fails, keep the metadata row and return an error
- the Media Library bulk delete UI does not use a separate bulk API; it calls the same `DELETE /api/cms/media/:id?websiteId=...` route for each selected item so reference checks remain centralized
- `GET /api/cms/media/:id/usage?websiteId=...` remains available for the Media table `Usage` action

## Admin Storage Usage

Route:

- `GET /api/cms/storage/usage`

Behavior:

- requires a valid admin session
- lists objects in the shared Supabase Storage `cms-media` bucket through server-only service-role code
- returns usage across all managed websites, not only the selected website
- never exposes the service-role key or raw storage credentials to browser code
- uses `SUPABASE_STORAGE_QUOTA_BYTES` to estimate remaining storage when configured
- returns `quotaConfigured: false` and `remainingBytes: null` when no valid quota is configured
- clamps remaining storage to `0` and returns `overQuotaBytes` when used storage exceeds the configured quota

Response:

```json
{
  "storage": {
    "bucket": "cms-media",
    "objectCount": 128,
    "usedBytes": 524288000,
    "quotaBytes": 1073741824,
    "quotaConfigured": true,
    "remainingBytes": 549453824,
    "overQuotaBytes": 0,
    "usagePercent": 49
  }
}
```

## Admin Categories

Routes:

- `GET /api/cms/categories?websiteId=...`
- `POST /api/cms/categories?websiteId=...`
- `PATCH /api/cms/categories/:id?websiteId=...`
- `DELETE /api/cms/categories/:id?websiteId=...`

Behavior:

- unique slug within website
- block delete or require reassignment when posts use the category

## Admin Redirects

Routes:

- `GET /api/cms/redirects?websiteId=...`
- `POST /api/cms/redirects?websiteId=...`
- `PATCH /api/cms/redirects/:id?websiteId=...`
- `DELETE /api/cms/redirects/:id?websiteId=...`

Behavior:

- support 301 and 302
- prevent duplicate `fromPath` per website
- prevent redirect loops
- public sites fetch active redirects only
- V1 does not require public redirect hit tracking
- public anon clients must not update `hit_count` or `last_hit_at`

## Admin Settings

Routes:

- `GET /api/cms/settings?websiteId=...`
- `PATCH /api/cms/settings?websiteId=...`

Settings include:

- robots.txt content
- sitemap settings
- SEO defaults
- site config values
- AdSense settings
- revalidation webhook URL
- encrypted revalidation webhook secret

AdSense settings shape:

```json
{
  "enabled": false,
  "publisherId": null,
  "autoAdsEnabled": true,
  "adsTxt": null
}
```

Rules:

- AdSense is scoped to the selected `websiteId`.
- New websites default to inactive AdSense settings.
- Enabling AdSense requires a valid `ca-pub-...` publisher ID.
- Disabling AdSense preserves saved values but public settings must return inactive behavior.
- No AdSense value belongs in `.env`; it is website-level database configuration.
- Changing AdSense settings triggers public website revalidation.

## Setup Project WordPress Import

WordPress import is not exposed by the main Admin CMS. It belongs to `setup-provisioning/`, which uses the same Supabase database and server-side service-role credentials.

Routes:

- `GET /api/cms/import?websiteId=...`
- `POST /api/cms/import?websiteId=...`
- `GET /api/cms/import/:jobId?websiteId=...`
- `POST /api/cms/import/reset?websiteId=...`

Import payload:

```json
{
  "wordpressBaseUrl": "https://example.com",
  "wordpressUsername": "optional-admin",
  "wordpressApplicationPassword": "optional-application-password",
  "confirmInactiveImport": true
}
```

Behavior:

- allow only inactive websites
- create/update a `cms_import_jobs` row for progress and report output
- write progress to `report.progress` with `phase`, `label`, `current`, `total`, and `percent`
- support public WordPress REST import without credentials when the source site allows it
- support optional WordPress username and application password for protected REST data
- fetch each WordPress resource type automatically across `page`/`per_page=100` batches until all records are received
- use `X-WP-TotalPages` when supplied and fall back to short-batch termination when pagination headers are unavailable
- select the first successful REST endpoint format for the remaining pages of that resource type
- never require OAuth client ID/client secret for v1 WordPress import
- never store WordPress import credentials in `.env`
- if a background import must persist credentials temporarily, encrypt them with `CMS_ENCRYPTION_KEY` and delete them after success or failure
- never include WordPress credentials in import reports, logs, public responses, or error messages
- import published posts, known page templates, custom pages, categories, authors, and images
- prefer Yoast SEO values for imported Focus keyphrase, SEO title, and meta description when the WordPress REST response contains `cms_yoast` and `yoast_head_json`
- use precedence `cms_yoast.focusKeyphrase -> null`, `cms_yoast.seoTitle -> yoast_head_json.title -> WordPress title`, and Yoast meta-description values only; missing descriptions remain `null`
- use import-only relaxed SEO/image mapping: missing `seoTitle`, `metaDescription`, and feature images are stored as `null`
- truncate a present imported meta description to 300 characters after decoding it
- do not apply the normal manual-save requirement for SEO fields or featured images during import
- create/select website-scoped authors for posts
- import WordPress user `description` into author `bio` after HTML/entity cleanup and a 2,000-character limit
- use fallback author `Imported Author` when WordPress author data is unavailable
- never import a post without `author_id`
- create/select fallback category `Uncategorized` when WordPress post category data is unavailable
- copy images to Supabase Storage
- rewrite old image URLs
- preserve safe imported HTML in Post `bodyHtml` and custom Page `bodyText`
- rewrite internal WordPress/source-domain links to relative CMS paths while preserving external links
- rewrite imported inline image URLs to Supabase Storage URLs with `data-media-id`
- keep compatible `bodyBlocks` as fallback for imported posts
- import WordPress pages that do not map to known fixed templates as custom pages
- record unmatched/skipped pages and skipped items in report
- failed reset clears only the inactive website's scoped rows and Supabase Storage objects
- include `seoSources`, `yoastBridgeDetected`, and a warning when the Yoast REST bridge was not available

## Admin Global Quiz API

Quiz is global and is not scoped by `websiteId`.

`GET /api/quiz`

- requires admin session
- returns the current global quiz from `cms_global_quiz`
- if no row exists yet, returns the minimum empty five-question scaffold for the admin UI

`PATCH /api/quiz`

- requires admin session
- writes through server-only Supabase service-role code
- accepts 5 to 10 questions and optional published status
- validates 4 non-empty options per question
- validates that each answer matches one option
- replaces the current global quiz data
- does not accept website ID, title, slug, description, visible date, or SEO date

Public quiz response shape:

```json
{
  "quizId": "11111111-1111-4111-8111-111111111111",
  "questions": [],
  "updatedAt": "2026-07-05T00:00:00.000Z"
}
```

## Public RPC/View Contracts

Public functions return only safe fields for active websites and public-safe resources.

Required public functions/views:

- `get_public_site_by_domain(domain)`
- `get_public_template_content(domain, template_key)`
- `get_public_page(domain, page_path)`
- `get_public_post(domain, slug)` for post detail lookup after the public route extracts the post slug from `/{categorySlug}/{postSlug}`
- `list_public_posts(domain, category_slug, search, limit_count, offset_count)`
- `list_public_categories(domain)`
- `list_public_authors(domain)`
- `get_public_site_settings(domain)`
- `list_public_redirects(domain)`
- `cms_public_get_current_quiz()`
- `list_public_posts_page(domain, category_slug, author_slug, search, limit_count, offset_count)`
- `get_public_author(domain, author_slug)`
- `list_public_content_index(domain)`

`list_public_posts_page` returns `{ items, total, hasMore }`; it preserves the older list RPC for compatibility, adds title/body search and author filtering, and is limited to safe pagination bounds. Every list item includes `readingTimeMinutes`, calculated from the stored CMS article HTML. It does not include the full article body, so archive-card payloads remain small. `list_public_categories` includes `postCount`. `list_public_content_index` returns published template, custom-page, post, category, and author sitemap records only.

Resolved public image object:

- `url`
- `alt`
- `caption`
- `width`
- `height`

Public site settings result should include safe AdSense fields:

```json
{
  "adsense": {
    "enabled": false,
    "publisherId": null,
    "autoAdsEnabled": true,
    "adsTxt": null
  }
}
```

Public RPCs must return `enabled: false` if AdSense is inactive or if the saved publisher ID is missing/invalid. Public websites render the AdSense script only when `enabled` is true and `publisherId` is present. Public websites expose `/ads.txt` only when AdSense is enabled and `adsTxt` is configured; otherwise `/ads.txt` should return `404`.

Public RPCs must resolve template/post JSON `mediaId` references to image objects for the resolved website. Public post/template responses should return resolved image objects, not raw media IDs. Raw media IDs can be omitted unless a public website explicitly needs them for non-sensitive internal rendering.

Public post result should include:

- title
- slug
- author name/slug/bio/avatar image object
- category
- featured image object
- `bodyHtml` when present, plus legacy body blocks with image references resolved to image objects
- SEO fields
- publish date

Public template result should include:

- template key
- path
- title
- content data with image references resolved to image objects
- SEO fields
- OG image object

Public current quiz result should include:

- questions
- quiz ID
- updated date

Quiz is global and does not accept a domain or `websiteId`.

Author avatar image object must include `url` and `alt` at minimum. Use the full resolved public image object shape when dimensions and caption are available.

Do not return:

- service-only IDs unless needed
- revalidation secrets
- inactive website data
- unpublished or deleted content
- non-public Storage paths

## Homepage And Revalidation Contract Updates

Home template saves validate rich HTML and repeatable quiz-information, step, and FAQ collections. `{date}` is accepted only by the public homepage rendering contract, not as a general content macro.

The public app revalidation endpoint authenticates `x-cms-revalidation-secret` against server-only `CMS_REVALIDATION_SECRET`, revalidates supplied absolute paths plus the shared `cms` cache tag, and returns `401` for an incorrect secret. CMS webhook payloads may include `event`, `resourceType`, `resourceId`, and `paths`.

## Public Revalidation Webhook

Each public website exposes a server-only endpoint. Admin CMS calls it after changes that affect public rendering.

Recommended request:

```json
{
  "websiteId": "uuid",
  "event": "post.published",
  "paths": ["/category-slug/post-title", "/blog", "/sitemap.xml"],
  "resourceType": "post",
  "resourceId": "uuid"
}
```

Required behavior:

- authenticate with per-website secret
- revalidate affected paths
- return success/failure to admin CMS
- admin should log or surface webhook failure without rolling back the content save
