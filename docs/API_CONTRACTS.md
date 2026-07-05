# API Contracts

All admin APIs are Next.js route handlers. All public reads are Supabase RPCs/views called by separate public websites.

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
- `POST /api/cms/websites`
- `GET /api/cms/websites/:id`
- `PATCH /api/cms/websites/:id`
- `POST /api/cms/websites/:id/deactivate`

Create payload:

```json
{
  "name": "Example Site",
  "primaryDomain": "example.com"
}
```

Behavior:

- generate unique slug
- create website inactive
- create primary domain row
- create default `cms_site_settings` row
- reject duplicate domain
- allow `PATCH` to update name, primary domain, and active/inactive status
- deactivate instead of deleting websites in v1
- do not require admin CMS `.env` changes when adding a website

## Admin Template Content

Routes:

- `GET /api/cms/template-content?websiteId=...`
- `POST /api/cms/template-content?websiteId=...`
- `GET /api/cms/template-content/:id?websiteId=...`
- `PATCH /api/cms/template-content/:id?websiteId=...`
- `POST /api/cms/template-content/:id/publish?websiteId=...`
- `POST /api/cms/template-content/:id/unpublish?websiteId=...`
- `POST /api/cms/template-content/:id/trash?websiteId=...`
- `POST /api/cms/template-content/:id/restore?websiteId=...`
- `DELETE /api/cms/template-content/:id?websiteId=...`

Save payload:

```json
{
  "templateKey": "about",
  "path": "/about",
  "title": "About Us",
  "contentData": {},
  "seoTitle": "About Us",
  "metaDescription": "About our company",
  "canonicalUrl": null,
  "robotsMeta": null,
  "ogImageId": null,
  "sitemapInclude": true,
  "status": "draft"
}
```

Behavior:

- validate `templateKey` against supported keys
- validate `contentData` against code-defined template schema
- enforce unique `(website_id, template_key)`
- block cross-website media references
- template content does not support future scheduling in v1

## Admin Authors

Routes:

- `GET /api/cms/authors?websiteId=...`
- `POST /api/cms/authors?websiteId=...`
- `GET /api/cms/authors/:id?websiteId=...`
- `PATCH /api/cms/authors/:id?websiteId=...`
- `POST /api/cms/authors/:id/trash?websiteId=...`
- `POST /api/cms/authors/:id/restore?websiteId=...`
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
- one admin user creates, edits, trashes, restores, and deletes authors
- unique author slug within selected website
- same author slug can exist on different websites
- avatar image must belong to the selected website
- inactive or trashed authors are not selectable for new posts
- permanent delete is blocked while posts reference the author, unless posts are reassigned first

## Admin Posts

Routes:

- `GET /api/cms/posts?websiteId=...`
- `POST /api/cms/posts?websiteId=...`
- `GET /api/cms/posts/:id?websiteId=...`
- `PATCH /api/cms/posts/:id?websiteId=...`
- `POST /api/cms/posts/:id/publish?websiteId=...`
- `POST /api/cms/posts/:id/unpublish?websiteId=...`
- `POST /api/cms/posts/:id/trash?websiteId=...`
- `POST /api/cms/posts/:id/restore?websiteId=...`
- `DELETE /api/cms/posts/:id?websiteId=...`

Save payload:

```json
{
  "title": "Post title",
  "slug": "post-title",
  "excerpt": "Short summary",
  "authorId": "uuid",
  "categoryId": null,
  "featuredImageId": null,
  "bodyBlocks": [],
  "seoTitle": null,
  "metaDescription": null,
  "canonicalUrl": null,
  "robotsMeta": null,
  "ogImageId": null,
  "sitemapInclude": true,
  "status": "draft",
  "publishedAt": null
}
```

Behavior:

- one category per post in v1
- one website-scoped author per post in v1
- validate `bodyBlocks`
- block duplicate slug within same website
- allow same slug across different websites
- block cross-website image/category/author references
- image blocks store `mediaId` as the primary reference
- posts do not support future scheduling in v1

## Admin Media

Routes:

- `GET /api/cms/media?websiteId=...`
- `POST /api/cms/media?websiteId=...`
- `PATCH /api/cms/media/:id?websiteId=...`
- `POST /api/cms/media/:id/trash?websiteId=...`
- `POST /api/cms/media/:id/restore?websiteId=...`
- `DELETE /api/cms/media/:id?websiteId=...`
- `GET /api/cms/media/:id/usage?websiteId=...`

Upload payload:

- multipart file
- `altText`
- `caption`

Behavior:

- validate file type and size
- convert/compress to WebP with server-side `sharp`
- upload to `websites/{website_id}/media/{yyyy}/{mm}/{uuid}.webp`
- upload with Supabase Storage `cacheControl: '31536000'`
- treat uploaded image objects as immutable; replacing image content creates a new UUID storage path and updates CMS references
- save metadata row
- media picker returns only selected website media
- trash does not delete Supabase Storage object
- permanent delete checks usage
- referenced media cannot be permanently deleted
- unused media deletes Supabase Storage object first, then hard deletes the metadata row
- if Supabase Storage deletion fails, keep the trashed media row and return an error

## Admin Categories

Routes:

- `GET /api/cms/categories?websiteId=...`
- `POST /api/cms/categories?websiteId=...`
- `PATCH /api/cms/categories/:id?websiteId=...`
- `POST /api/cms/categories/:id/trash?websiteId=...`
- `POST /api/cms/categories/:id/restore?websiteId=...`
- `DELETE /api/cms/categories/:id?websiteId=...`

Behavior:

- unique slug within website
- block permanent delete or require reassignment when posts use the category

## Admin Redirects

Routes:

- `GET /api/cms/redirects?websiteId=...`
- `POST /api/cms/redirects?websiteId=...`
- `PATCH /api/cms/redirects/:id?websiteId=...`
- `POST /api/cms/redirects/:id/trash?websiteId=...`
- `POST /api/cms/redirects/:id/restore?websiteId=...`
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

## WordPress Import

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
- never require OAuth client ID/client secret for v1 WordPress import
- never store WordPress import credentials in `.env`
- if a background import must persist credentials temporarily, encrypt them with `CMS_ENCRYPTION_KEY` and delete them after success or failure
- never include WordPress credentials in import reports, logs, public responses, or error messages
- import published posts, known page templates, categories, authors, and images
- create/select website-scoped authors for posts
- use fallback author `Imported Author` when WordPress author data is unavailable
- never import a post without `author_id`
- copy images to Supabase Storage
- rewrite old image URLs
- convert post content to supported body blocks where possible
- record unmatched pages and skipped items in report
- failed reset clears only the inactive website's scoped rows and Supabase Storage objects

## Admin Global Quiz API

Quiz is global and is not scoped by `websiteId`.

`GET /api/quiz`

- requires admin session
- returns the current global quiz from `cms_global_quiz`
- if no row exists yet, returns an empty 5-question scaffold for the admin UI

`PATCH /api/quiz`

- requires admin session
- writes through server-only Supabase service-role code
- accepts exactly 5 questions and optional published status
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
- `get_public_post(domain, slug)`
- `list_public_posts(domain, category_slug, search, limit_count, offset_count)`
- `list_public_categories(domain)`
- `list_public_authors(domain)`
- `get_public_site_settings(domain)`
- `list_public_redirects(domain)`
- `cms_public_get_current_quiz()`

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
- excerpt
- author name/slug/bio/avatar image object
- category
- featured image object
- body blocks with image references resolved to image objects
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
- drafts
- inactive website data
- trashed rows

## Public Revalidation Webhook

Each public website exposes a server-only endpoint. Admin CMS calls it after changes that affect public rendering.

Recommended request:

```json
{
  "websiteId": "uuid",
  "event": "post.published",
  "paths": ["/blog/post-title", "/blog", "/sitemap.xml"],
  "resourceType": "post",
  "resourceId": "uuid"
}
```

Required behavior:

- authenticate with per-website secret
- revalidate affected paths
- return success/failure to admin CMS
- admin should log or surface webhook failure without rolling back the content save
