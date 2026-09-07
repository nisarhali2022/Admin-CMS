# CMS Data Model

All normal CMS resources are scoped by `website_id`. Use UUID primary keys, `created_at`, and `updated_at` timestamps for all CMS tables unless stated otherwise.

## Global Rules

- V1 is publish-only for content resources.
- Draft, unpublish, trash, and restore workflows are not part of the active CMS.
- `published_at` is set when pages/posts/template content are saved.
- Delete means permanent delete after admin confirmation.
- Slugs are lowercase, URL-safe, and unique within each website where applicable.
- Use `jsonb` for template `content_data`, legacy post `body_blocks`, SEO extras, sitemap settings, and site content/config values.

## Local SEO And Sitemap Maintenance (2026-07-16)

- Fixed template paths use `/about-us`, `/contact-us`, and `/privacy-policy` as their canonical values; `/about`, `/contact`, and `/privacy` remain frontend redirects only.
- CMS pages at `/telenor-quiz-today` and `/404-page` are kept out of the sitemap and use `noindex,follow`.
- Blank public fixed-template social images can reuse the Home template's existing `og_image_id`. Custom Pages use `featured_image_id` as their public social-image fallback; existing chosen images are never replaced.
- Active redirects have a partial `(website_id, from_path)` lookup index for exact public redirect reads.
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
- Permanent website deletion is owned by `setup-provisioning/`, is allowed only for inactive websites, and removes all website-scoped rows plus website-owned Supabase Storage objects.

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
| `focus_keyphrase` | text | no | page SEO focus keyphrase |
| `seo_title` | text | no | manual SEO title |
| `meta_description` | text | no | manual meta description |
| `author_id` | uuid | no | optional website-scoped page author |
| `canonical_url` | text | no | optional override |
| `robots_meta` | text | no | optional robots value |
| `og_image_id` | uuid | no | references `cms_media(id)` |
| `sitemap_include` | boolean | yes | default true |
| `published_at` | timestamptz | no | publish date |
| `created_at` | timestamptz | yes | default now |
| `updated_at` | timestamptz | yes | updated on change |

`author_id`, when set, must reference an active author for the same website.

Supported `template_key` values:

- `home`
- `about`
- `contact`
- `privacy`
- `terms`
- `packages`

Constraints and indexes:

- unique `(website_id, template_key)`
- unique `(website_id, path)`
- index `(website_id, published_at)`

Behavior:

- Stores fixed website templates only. Generic/custom admin pages are stored in `cms_pages`.
- No layout data is stored.
- `content_data` stores editable text, links, and image references only.
- Template content does not support future scheduling in v1.
- Image references inside `content_data` must point to media rows owned by the same `website_id`.

### `cms_pages`

Stores WordPress-style custom pages per website.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `id` | uuid | yes | primary key |
| `website_id` | uuid | yes | references `cms_websites(id)` |
| `title` | text | yes | admin/public title |
| `path` | text | yes | public path, such as `/about-us`; `/` is reserved for Home |
| `body_text` | text | yes | sanitized page editor HTML/content |
| `focus_keyphrase` | text | no | page SEO focus keyphrase |
| `seo_title` | text | no | manual SEO title |
| `meta_description` | text | no | manual meta description |
| `author_id` | uuid | no | optional website-scoped page author |
| `canonical_url` | text | no | optional override |
| `robots_meta` | text | no | optional robots value |
| `featured_image_id` | uuid | no | references `cms_media(id)` |
| `sitemap_include` | boolean | yes | default true |
| `published_at` | timestamptz | no | publish date |
| `created_at` | timestamptz | yes | default now |
| `updated_at` | timestamptz | yes | updated on change |

Constraints and indexes:

- unique `(website_id, path)`
- `/` is reserved for fixed Home template content
- same-website foreign keys for `author_id` and `featured_image_id`
- RLS enabled; direct anon/authenticated table access revoked

Behavior:

- `Add Page` creates rows here and never consumes fixed template slots.
- Public custom page reads use `get_public_page(domain, path)`.
- WordPress pages that do not map to known fixed templates import here.

### Home Template Content Contract

The `home` `cms_template_content.content_data` object supports `introHtml`, `latestNewsTitle`, `quizHeadingTemplate`, `quizInfoSections`, `conclusionHeading`, `conclusionHtml`, `stepsHeading`, `steps`, `faqHeading`, and `faqs` in addition to the existing hero/CTA fields. HTML fields are sanitized server-side. Section and step keys must be unique, URL-safe identifiers. The only supported runtime template token is `{date}` and it is rendered by the homepage only for the quiz heading and homepage SEO fields.

Public path ownership is shared across templates, custom pages, and categories. CMS services reject a path collision and reserve `api`, `admin`, `author`, `blog`, `search`, and `tag` for the frontend. Migration `202607140003_route_guards.sql` adds the same reserved-route floor at the database boundary.

### `cms_categories`

Stores blog categories per website.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `id` | uuid | yes | primary key |
| `website_id` | uuid | yes | references `cms_websites(id)` |
| `name` | text | yes | category name |
| `slug` | text | yes | URL-safe |
| `description` | text | no | optional |
| `created_at` | timestamptz | yes | default now |
| `updated_at` | timestamptz | yes | updated on change |

Constraints and indexes:

- unique `(website_id, slug)`
- index `website_id`

Behavior:

- One category per post is required in v1 because category slug is part of the public post URL.
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
| `created_at` | timestamptz | yes | default now |
| `updated_at` | timestamptz | yes | updated on change |

Constraints and indexes:

- unique `(website_id, slug)`
- index `(website_id, is_active)`

Behavior:

- Authors cannot sign in.
- One admin user manages all authors.
- Author avatar image must belong to the same `website_id`.
- Inactive authors are not selectable for new posts.
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
| `category_id` | uuid | no | references `cms_categories(id)`; required by admin validation for new saves |
| `author_id` | uuid | yes | references `cms_authors(id)` |
| `title` | text | yes | post title |
| `slug` | text | yes | URL-safe |
| `featured_image_id` | uuid | no | references `cms_media(id)` |
| `body_html` | text | no | preferred Tiptap editor HTML for new edits |
| `body_blocks` | jsonb | yes | legacy/import fallback structured blocks array |
| `seo_title` | text | no | manual SEO title |
| `meta_description` | text | no | manual meta description |
| `canonical_url` | text | no | optional override |
| `robots_meta` | text | no | optional robots value |
| `og_image_id` | uuid | no | references `cms_media(id)` |
| `sitemap_include` | boolean | yes | default true |
| `published_at` | timestamptz | no | publish date |
| `created_at` | timestamptz | yes | default now |
| `updated_at` | timestamptz | yes | updated on change |

Preferred post body format:

- New admin edits save sanitized Tiptap HTML in `body_html`.
- Public sites should render `body_html` when present.
- Images inside `body_html` include `data-media-id` so media usage checks can find references.
- `body_blocks` remains for backward compatibility and imported legacy content.

Supported legacy `body_blocks`:

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

- unique `(website_id, slug)`
- index `(website_id, published_at)`
- index `(website_id, category_id)`
- index `(website_id, author_id)`

Behavior:

- Layout is fixed in public website code.
- Admin edits post body through the shared Tiptap visual editor.
- Each post has one website-scoped author in v1.
- Author, category, featured image, OG image, editor image references, and legacy image blocks must belong to the same `website_id`.
- Blog posts do not support future scheduling in v1.
- TOC block placement controls where generated heading links render.
- FAQ blocks can generate FAQ schema.

### `cms_media`

Stores media metadata. File bytes live in Supabase Storage.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `id` | uuid | yes | primary key |
| `website_id` | uuid | yes | references `cms_websites(id)` |
| `original_filename` | text | yes | metadata only |
| `storage_path` | text | yes | unique Supabase Storage path |
| `public_url` | text | yes | Supabase Storage public URL |
| `alt_text` | text | no | image alt text |
| `caption` | text | no | optional caption |
| `width` | integer | no | image width |
| `height` | integer | no | image height |
| `mime_type` | text | yes | usually `image/webp` |
| `file_size` | bigint | no | optimized size |
| `source` | text | yes | `upload` or `wordpress_import` |
| `created_at` | timestamptz | yes | default now |
| `updated_at` | timestamptz | yes | updated on change |

Supabase Storage path format:

```text
websites/{website_id}/media/{yyyy}/{mm}/{filename}.webp
```

Constraints and indexes:

- unique `storage_path`
- `storage_path` must use `websites/{website_id}/media/{yyyy}/{mm}/{filename}.webp`, where the filename contains only letters, numbers, hyphens, or underscores; legacy UUID filenames remain valid.
- index `(website_id, source)`

Behavior:

- Media picker filters by selected `website_id`.
- No shared/global media library.
- Public WebP uploads use Supabase Storage `cacheControl: '31536000'`.
- V1 stores one optimized public WebP object per media row; thumbnail/object variants are deferred unless matching metadata fields are added later.
- Media objects are immutable public assets; image replacement creates a new readable filename path with a numeric collision suffix and updates CMS references.
- Do not overwrite an existing public image URL.
- Delete checks references first.
- If references exist, delete is blocked.
- If unused, delete the Supabase Storage object first, then hard delete the `cms_media` row.
- If Supabase Storage deletion fails, keep the metadata row and return an error.
- Admin bulk delete is UI-level batching only; it calls the same permanent delete behavior per selected media row.
- Media table search is client-side and automatic over loaded website media metadata.

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
| `created_at` | timestamptz | yes | default now |
| `updated_at` | timestamptz | yes | updated on change |

Constraints and indexes:

- unique `(website_id, from_path)`
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
| `report` | jsonb | yes | progress, counts, skipped items, unmatched pages, failed media |
| `error_message` | text | no | failure summary |
| `created_at` | timestamptz | yes | default now |
| `updated_at` | timestamptz | yes | updated on change |

Constraints and indexes:

- index `(website_id, status)`
- index `(website_id, created_at)`

Behavior:

- Admin-only table.
- Import is allowed only for inactive websites.
- `report.progress` stores current phase, label, current count, total count, and percent for admin progress UI.
- WordPress credentials are optional and used only when public REST data is unavailable or incomplete.
- WordPress username/application password must not be stored in `.env`.
- If long-running import requires temporary credential persistence, store encrypted credentials only in `temporary_credentials_encrypted` using `CMS_ENCRYPTION_KEY`.
- Clear `temporary_credentials_encrypted` after import success, failure, or reset.
- Reports and errors must never include WordPress credentials.
- Import creates or selects website-scoped authors for imported posts.
- If WordPress author data is unavailable, create or select a fallback author named `Imported Author`.
- Posts must never be imported without `author_id`.
- If WordPress category data is unavailable, create or select a fallback category named `Uncategorized`.
- Report must include imported template content, custom pages, posts, categories, authors when detected, images, rewritten URLs, unmatched/skipped pages, failed media URLs, and errors.

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
| `adsense_settings` | jsonb | yes | website-level AdSense control; default inactive |
| `revalidation_url` | text | no | public site webhook URL |
| `revalidation_secret_encrypted` | text | no | encrypted secret for public site webhook |
| `created_at` | timestamptz | yes | default now |
| `updated_at` | timestamptz | yes | updated on change |

Constraints and indexes:

- unique `website_id`

Behavior:

- New websites default to inactive AdSense settings:
  `{"enabled": false, "publisherId": null, "autoAdsEnabled": true, "adsTxt": null}`.
- Enabling AdSense requires a valid `ca-pub-...` publisher ID.
- Disabling AdSense keeps the saved publisher ID, auto-ads preference, and `ads.txt` text, but public output must behave as inactive.
- Public reads expose only safe settings.
- Safe public AdSense fields are `enabled`, `publisherId`, `autoAdsEnabled`, and `adsTxt`.
- Revalidation secrets stay admin-only.
- Encrypt revalidation secrets with server-only `CMS_ENCRYPTION_KEY`.
- AdSense setting changes affect public rendering and must trigger revalidation.

### `cms_global_quiz`

Stores the current global quiz. This table is not website-scoped and must not include `website_id`.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `quiz_id` | uuid | yes | primary key |
| `questions` | jsonb | yes | 5 to 10 question objects |
| `is_published` | boolean | yes | public visibility |
| `updated_at` | timestamptz | yes | updated on change |

Question JSON shape:

```json
{
  "question": "Question text",
  "options": ["A", "B", "C", "D"],
  "answer": "A"
}
```

Behavior:

- Quiz is global for all public websites.
- The table stores only the current quiz, not quiz history or page metadata.
- Public websites read only the latest published quiz through `cms_public_get_current_quiz()`.
- Admin writes use server-only service-role code.
- Validation requires 5 to 10 questions, 4 non-empty options per question, and an answer that matches an option.
- Homepage/page SEO is managed by website template/settings data, not by the quiz table.

## Removed From V1

Do not create these tables in v1:

- `cms_tags`
- `cms_post_tags`
- `cms_audit_events`

## Reference Checks For Media Delete

Before permanent media delete, check:

- `cms_posts.featured_image_id`
- `cms_posts.og_image_id`
- `cms_posts.body_html` image `data-media-id` references
- `cms_posts.body_blocks` image references
- `cms_pages.featured_image_id`
- `cms_authors.avatar_image_id`
- `cms_template_content.og_image_id`
- `cms_template_content.content_data` image references

If references exist, block permanent delete and return usage locations.
