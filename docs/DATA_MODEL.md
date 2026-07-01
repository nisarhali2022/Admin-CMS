# CMS Data Model

All normal CMS resources are scoped by `website_id`. Use UUID primary keys, `created_at`, and `updated_at` timestamps for all CMS tables unless stated otherwise.

## Global Rules

- Use `deleted_at timestamptz` for trashable resources.
- Public reads must ignore rows where `deleted_at is not null`.
- Use status values consistently: `draft`, `published`, `unpublished`.
- `published_at` controls publish date.
- Slugs are lowercase, URL-safe, and unique within each website where applicable.
- Use `jsonb` for template `content_data`, post `body_blocks`, SEO extras, sitemap settings, and site content/config values.
- Validate JSON shape in app validators before saving.
- Image references inside JSON should store `mediaId` as the primary reference. Public URLs are derived from `cms_media`.

## Tables

### `cms_websites`

Stores each managed public website.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `id` | uuid | yes | primary key |
| `name` | text | yes | admin display name |
| `slug` | text | yes | unique, auto-generated |
| `primary_domain` | text | yes | normalized, mainly non-www |
| `is_active` | boolean | yes | default false |
| `created_at` | timestamptz | yes | default now |
| `updated_at` | timestamptz | yes | updated on change |

Constraints and indexes:

- unique `slug`
- unique `primary_domain`
- index `is_active`

Behavior:

- New websites start inactive.
- Deactivation keeps associated resources.
- Permanent website deletion is not included in v1.

### `cms_website_domains`

Maps domains and future aliases to websites.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `id` | uuid | yes | primary key |
| `website_id` | uuid | yes | references `cms_websites(id)` |
| `domain` | text | yes | normalized domain |
| `is_primary` | boolean | yes | default false |
| `created_at` | timestamptz | yes | default now |
| `updated_at` | timestamptz | yes | updated on change |

Constraints and indexes:

- unique `domain`
- index `website_id`
- at most one primary domain per website

Behavior:

- V1 UI edits one primary domain.
- Public RPCs resolve website context through this table.

### `cms_template_content`

Stores fixed-template page content for each website.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `id` | uuid | yes | primary key |
| `website_id` | uuid | yes | references `cms_websites(id)` |
| `template_key` | text | yes | supported key |
| `path` | text | yes | public path, such as `/about` |
| `title` | text | yes | admin/public title |
| `content_data` | jsonb | yes | code-defined template fields |
| `seo_title` | text | no | manual SEO title |
| `meta_description` | text | no | manual meta description |
| `canonical_url` | text | no | optional override |
| `robots_meta` | text | no | optional robots value |
| `og_image_id` | uuid | no | references `cms_media(id)` |
| `sitemap_include` | boolean | yes | default true |
| `status` | text | yes | draft/published/unpublished |
| `published_at` | timestamptz | no | publish date |
| `deleted_at` | timestamptz | no | trash marker |
| `created_at` | timestamptz | yes | default now |
| `updated_at` | timestamptz | yes | updated on change |

Supported `template_key` values:

- `home`
- `about`
- `contact`
- `privacy`
- `terms`
- `packages`

Constraints and indexes:

- unique `(website_id, template_key)`
- unique `(website_id, path)` for non-trashed rows
- index `(website_id, status)`
- index `(website_id, deleted_at)`

Behavior:

- Replaces generic pages in v1.
- No layout data is stored.
- `content_data` stores editable text, links, and image references only.
- Template content does not support future scheduling in v1.
- Image references inside `content_data` must point to media rows owned by the same `website_id`.

### `cms_categories`

Stores blog categories per website.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `id` | uuid | yes | primary key |
| `website_id` | uuid | yes | references `cms_websites(id)` |
| `name` | text | yes | category name |
| `slug` | text | yes | URL-safe |
| `description` | text | no | optional |
| `deleted_at` | timestamptz | no | trash marker |
| `created_at` | timestamptz | yes | default now |
| `updated_at` | timestamptz | yes | updated on change |

Constraints and indexes:

- unique `(website_id, slug)` for non-trashed rows
- index `website_id`

Behavior:

- One category per post in v1.
- Tags are not included in v1.

### `cms_authors`

Stores blog author profiles per website. Authors are content records, not login users.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `id` | uuid | yes | primary key |
| `website_id` | uuid | yes | references `cms_websites(id)` |
| `name` | text | yes | display name |
| `slug` | text | yes | URL-safe author slug |
| `bio` | text | no | author bio |
| `avatar_image_id` | uuid | no | references `cms_media(id)` |
| `is_active` | boolean | yes | default true |
| `deleted_at` | timestamptz | no | trash marker |
| `created_at` | timestamptz | yes | default now |
| `updated_at` | timestamptz | yes | updated on change |

Constraints and indexes:

- unique `(website_id, slug)` for non-trashed rows
- index `(website_id, is_active)`
- index `(website_id, deleted_at)`

Behavior:

- Authors cannot sign in.
- One admin user manages all authors.
- Author avatar image must belong to the same `website_id`.
- Trashed or inactive authors are not selectable for new posts.
- Permanent delete is blocked while posts reference the author, unless posts are reassigned first.

Migration note:

- `avatar_image_id` references `cms_media(id)`.
- If migrations follow this document order, create `cms_media` before adding this foreign key, or add the avatar foreign key after both `cms_authors` and `cms_media` exist.

### `cms_posts`

Stores blog posts per website.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `id` | uuid | yes | primary key |
| `website_id` | uuid | yes | references `cms_websites(id)` |
| `category_id` | uuid | no | references `cms_categories(id)` |
| `author_id` | uuid | yes | references `cms_authors(id)` |
| `title` | text | yes | post title |
| `slug` | text | yes | URL-safe |
| `excerpt` | text | no | summary |
| `featured_image_id` | uuid | no | references `cms_media(id)` |
| `body_blocks` | jsonb | yes | structured blocks array |
| `seo_title` | text | no | manual SEO title |
| `meta_description` | text | no | manual meta description |
| `canonical_url` | text | no | optional override |
| `robots_meta` | text | no | optional robots value |
| `og_image_id` | uuid | no | references `cms_media(id)` |
| `sitemap_include` | boolean | yes | default true |
| `status` | text | yes | draft/published/unpublished |
| `published_at` | timestamptz | no | publish date |
| `deleted_at` | timestamptz | no | trash marker |
| `created_at` | timestamptz | yes | default now |
| `updated_at` | timestamptz | yes | updated on change |

Supported `body_blocks`:

- `paragraph`
- `heading`
- `image`
- `list`
- `quote`
- `link_button`
- `toc`
- `faq`
- `table`
- `callout`

Constraints and indexes:

- unique `(website_id, slug)` for non-trashed rows
- index `(website_id, status, published_at)`
- index `(website_id, category_id)`
- index `(website_id, author_id)`
- index `(website_id, deleted_at)`

Behavior:

- Layout is fixed in public website code.
- Admin can add and reorder body blocks.
- Each post has one website-scoped author in v1.
- Author, category, featured image, OG image, and image blocks must belong to the same `website_id`.
- Blog posts do not support future scheduling in v1.
- TOC block placement controls where generated heading links render.
- FAQ blocks can generate FAQ schema.

### `cms_media`

Stores media metadata. File bytes live in Cloudflare R2.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `id` | uuid | yes | primary key |
| `website_id` | uuid | yes | references `cms_websites(id)` |
| `original_filename` | text | yes | metadata only |
| `r2_object_key` | text | yes | unique object key |
| `public_url` | text | yes | custom media domain URL |
| `alt_text` | text | no | image alt text |
| `caption` | text | no | optional caption |
| `width` | integer | no | image width |
| `height` | integer | no | image height |
| `mime_type` | text | yes | usually `image/webp` |
| `file_size` | bigint | no | optimized size |
| `source` | text | yes | `upload` or `wordpress_import` |
| `deleted_at` | timestamptz | no | trash marker |
| `created_at` | timestamptz | yes | default now |
| `updated_at` | timestamptz | yes | updated on change |

R2 key format:

```text
websites/{website_id}/media/{yyyy}/{mm}/{uuid}.webp
websites/{website_id}/media/{yyyy}/{mm}/{uuid}-thumb.webp
```

Constraints and indexes:

- unique `r2_object_key`
- index `(website_id, deleted_at)`
- index `(website_id, source)`

Behavior:

- Media picker filters by selected `website_id`.
- No shared/global media library.
- Public WebP uploads use `Cache-Control: public, max-age=31536000, immutable`.
- Media objects are immutable public assets; image replacement creates a new UUID object key and updates CMS references.
- Do not overwrite an existing public image URL.
- Trash keeps R2 object.
- Permanent delete checks references first.
- If references exist, permanent delete is blocked.
- If unused, delete the R2 object first, then hard delete the `cms_media` row.
- If R2 deletion fails, keep the row trashed and return an error.

### `cms_redirects`

Stores redirects per website.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `id` | uuid | yes | primary key |
| `website_id` | uuid | yes | references `cms_websites(id)` |
| `from_path` | text | yes | source path, starts with `/` |
| `to_url` | text | yes | destination path or URL |
| `redirect_type` | integer | yes | 301 or 302 |
| `is_active` | boolean | yes | default true |
| `hit_count` | integer | yes | default 0 |
| `last_hit_at` | timestamptz | no | optional |
| `deleted_at` | timestamptz | no | trash marker |
| `created_at` | timestamptz | yes | default now |
| `updated_at` | timestamptz | yes | updated on change |

Constraints and indexes:

- unique `(website_id, from_path)` for non-trashed rows
- check `redirect_type in (301, 302)`
- index `(website_id, is_active)`

Behavior:

- Prevent duplicate redirect paths per website.
- Prevent redirect loops.
- Public sites fetch active redirects for their resolved website.
- Hit tracking fields are reserved for future server-side telemetry.
- V1 public websites must not update `hit_count` or `last_hit_at` with anon credentials.

### `cms_import_jobs`

Tracks long-running WordPress import progress and reports.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `id` | uuid | yes | primary key |
| `website_id` | uuid | yes | references `cms_websites(id)` |
| `source_type` | text | yes | `wordpress` in v1 |
| `source_url` | text | yes | WordPress base URL |
| `status` | text | yes | queued/running/succeeded/failed |
| `started_at` | timestamptz | no | import start time |
| `finished_at` | timestamptz | no | import end time |
| `temporary_credentials_encrypted` | text | no | optional encrypted WordPress credentials for active background import only |
| `report` | jsonb | yes | counts, skipped items, unmatched pages, failed media |
| `error_message` | text | no | failure summary |
| `created_at` | timestamptz | yes | default now |
| `updated_at` | timestamptz | yes | updated on change |

Constraints and indexes:

- index `(website_id, status)`
- index `(website_id, created_at)`

Behavior:

- Admin-only table.
- Import is allowed only for inactive websites.
- WordPress credentials are optional and used only when public REST data is unavailable or incomplete.
- WordPress username/application password must not be stored in `.env`.
- If long-running import requires temporary credential persistence, store encrypted credentials only in `temporary_credentials_encrypted` using `CMS_ENCRYPTION_KEY`.
- Clear `temporary_credentials_encrypted` after import success, failure, or reset.
- Reports and errors must never include WordPress credentials.
- Import creates or selects website-scoped authors for imported posts.
- If WordPress author data is unavailable, create or select a fallback author named `Imported Author`.
- Posts must never be imported without `author_id`.
- Report must include imported template content, posts, categories, authors when detected, images, rewritten URLs, unmatched pages, skipped items, failed media URLs, and errors.

### `cms_site_settings`

Stores per-website settings.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `id` | uuid | yes | primary key |
| `website_id` | uuid | yes | references `cms_websites(id)` |
| `robots_txt` | text | no | editable robots.txt |
| `sitemap_settings` | jsonb | yes | sitemap defaults/options |
| `seo_defaults` | jsonb | yes | fallback SEO values |
| `site_config` | jsonb | yes | content/config values |
| `revalidation_url` | text | no | public site webhook URL |
| `revalidation_secret_encrypted` | text | no | encrypted secret for public site webhook |
| `created_at` | timestamptz | yes | default now |
| `updated_at` | timestamptz | yes | updated on change |

Constraints and indexes:

- unique `website_id`

Behavior:

- Public reads expose only safe settings.
- Revalidation secrets stay admin-only.
- Encrypt revalidation secrets with server-only `CMS_ENCRYPTION_KEY`.

## Removed From V1

Do not create these tables in v1:

- `cms_pages`
- `cms_tags`
- `cms_post_tags`
- `cms_audit_events`

## Reference Checks For Media Delete

Before permanent media delete, check:

- `cms_posts.featured_image_id`
- `cms_posts.og_image_id`
- `cms_posts.body_blocks` image references
- `cms_authors.avatar_image_id`
- `cms_template_content.og_image_id`
- `cms_template_content.content_data` image references

If references exist, block permanent delete and return usage locations.
