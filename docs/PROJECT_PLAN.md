# Single-Admin Multi-Website CMS Plan

## Summary

Build this project as a separate admin CMS deployed on its own Vercel domain. The public websites are already deployed separately, keep their own UI/theme/design, and read public-safe CMS data from Supabase.

There is one admin user using the existing `ADMIN_SECRET` session. After login, the admin selects a website to manage. Normal CMS resources are scoped by `website_id`. Quiz is global: no website selection is required, and one quiz update applies to all websites.

The main CMS manages daily website content only: text, links, images, fixed-template page content, blog posts, blog authors, categories, redirects, SEO fields, robots, sitemap settings, AdSense settings, and website settings for websites that already exist. Website provisioning, schema migrations, and WordPress import live in the separate `setup-provisioning/` project that uses the same Supabase database. Public websites own their layouts, frontend themes, visual components, and visitor-facing rendering.

## Locked Decisions

- One admin user only; no roles/users table in v1.
- Keep the current `ADMIN_SECRET` login/session model for v1.
- Admin app has its own separate Vercel domain.
- Public websites are separate apps/sites and read public-safe CMS data from Supabase.
- Public websites use Supabase anon key with RLS.
- Public websites read through public read-only Supabase RPCs/views, not raw admin write APIs.
- Public websites identify themselves by domain lookup.
- Public websites can read public-safe CMS data only.
- Admin app uses Supabase service key only inside server route handlers after admin-session validation.
- `website_id` is the foreign key for normal website-specific resources.
- Website selection controls template content, posts, authors, media, categories, redirects, SEO, sitemap, robots, AdSense, and settings.
- Website selection is explicit in the URL with `websiteId`.
- Quiz publishing is global and not limited by selected website.
- Tags are not included in v1.
- Audit events/activity log are not included in v1.
- Media is per website only; there is no shared/global media library.
- Supabase Storage is the media storage backend.
- Media Library uses a table workflow with automatic client-side search, checkbox selection, bulk permanent delete through the existing safe delete endpoint, and a `Usage` action for reference checks.
- Public website layouts are fixed.
- Blog layouts are fixed, and new blog article edits use sanitized Tiptap HTML. Legacy structured body blocks remain only as import/backward-compatibility fallback.
- Blog authors are website-scoped profile records, not login users.
- Template content and blog posts do not support future scheduling in v1.
- Quiz is global current data and separate from CMS page/post scheduling.
- Template content schemas are code-defined.
- AdSense control is website-scoped, stored in site settings, and not configured through `.env`.
- Website creation/edit/deactivation, default setup rows, migrations, and WordPress import are owned by `setup-provisioning/`, not the main daily CMS.
- No page builder or layout builder in v1.
- Separation of concerns is required in code and docs.

## Current Repo Context

The current project is a cleaned Next.js App Router rebuild workspace. It currently has:

- A minimal CMS rebuild placeholder in `app/page.jsx`.
- Admin-secret cookie auth in `packages/cms-core/adminAuth.js`.
- Admin session API route in `app/api/admin/session/route.js`.
- Legacy WordPress quiz publishing code removed from this rebuild copy.
- No Supabase integration yet.

The CMS implementation should keep the useful auth/session pattern, but split the current single-page style into feature modules before adding CMS functionality.

## Website Provisioning

The admin manages website setup from the separate `setup-provisioning/` project.

Website provisioning supports:

- Add website.
- Edit website name/domain/status/settings.
- Deactivate website.
- Select website to continue setup/import.

Website creation requires:

- Website name.
- Primary domain, mainly non-www.
- Auto-generated unique website slug.

Website creation behavior:

- New websites start inactive.
- V1 admin UI shows one primary domain field.
- Schema keeps a `cms_website_domains` table so aliases can be supported later.
- Public websites resolve `website_id` by matching their domain in `cms_website_domains`.
- Adding a website is managed through setup/database records, not by editing the admin CMS `.env`.
- Website data is stored in `cms_websites`, `cms_website_domains`, `cms_site_settings`, and related website-scoped tables.
- Website media uses the shared Supabase Storage bucket with `websites/{website_id}/media/...` storage path prefixes.
- Creating a website should also create or initialize its default `cms_site_settings` row.

Website removal behavior:

- Removal means deactivate first.
- Deactivation hides/disables the website for public reads.
- Deactivation keeps all associated template content, posts, media, categories, redirects, and settings.
- Permanent website deletion is not included in v1.

## Data Model

Use Supabase tables with clear ownership and strict `website_id` scoping.

### Website Registry

`cms_websites`

- `id`
- `name`
- `slug`
- `primary_domain`
- `is_active`
- `created_at`
- `updated_at`

### Website Domains

`cms_website_domains`

- `id`
- `website_id`
- `domain`
- `is_primary`
- unique domain constraint

V1 UI uses one primary domain, but this table allows aliases later.

### Template Content

`cms_template_content`

- `website_id`
- `template_key`
- `path`
- `title`
- `content_data`
- SEO title
- meta description
- canonical override
- robots/index setting
- Open Graph image
- sitemap include flag
- publish timestamp

Supported v1 template keys:

- `home`
- `about`
- `contact`
- `privacy`
- `terms`
- `packages`

Rules:

- Template content is only for fixed public website templates.
- Custom WordPress-style pages are stored in `cms_pages`.
- Add Page creates a custom page row, not a fixed template row.
- Template schemas are code-defined.
- Each `template_key` has expected fields.
- Website code owns layout/design/components.
- CMS owns editable text, links, images, and SEO fields.
- No drag/drop page builder.
- No layout editing.
- No future scheduling for template content in v1.

### Blog Posts

`cms_posts`

- `website_id`
- author ID
- title
- slug
- excerpt
- publish date
- required category ID
- featured image ID
- body HTML
- legacy/import fallback body blocks
- SEO title
- meta description
- canonical override
- robots/index setting
- Open Graph image
- sitemap include flag
- publish timestamp

Preferred v1 body editor:

- New admin edits use the shared Tiptap visual editor.
- Saved post content uses sanitized `body_html`.
- Editor images store `data-media-id` so media usage checks can resolve ownership.
- Legacy/imported `body_blocks` remain supported as fallback content.

Supported legacy `body_blocks`:

- paragraph
- heading
- image
- list
- quote
- link/button
- TOC placeholder
- FAQ
- table
- callout

Rules:

- Blog post page layout stays fixed in public website code.
- Admin can write article body content with Tiptap formatting, media-library images, YouTube embeds, tables, and Code mode HTML review.
- Each post must have one category in v1 because category slug is part of the public post URL.
- Each post has one website-scoped author in v1.
- Authors are selected from the selected website's author records.
- Multiple categories per post are not included in v1.
- Future scheduling for posts is not included in v1.
- TOC placeholder block controls where TOC appears.
- TOC entries are generated from heading blocks.
- FAQ uses a structured question/answer block.
- FAQ block can generate FAQ schema.
- Table and callout blocks support package comparisons and highlighted notes.
- Blog editor uses the shared Tiptap editor; public websites keep a fixed post layout.

### Other Website-Scoped Resources

`cms_media`

- `website_id`
- original filename
- Supabase Storage path
- public URL
- alt text
- caption
- width
- height
- MIME type
- file size
- source: upload or WordPress import

Media Library UI behavior:

- Search filters automatically while the admin types.
- Bulk delete is permanent after one confirmation and calls the existing media delete route for each selected item.
- Server-side media delete still checks references and blocks deletion when media is used.
- The `Usage` action remains available so admins can manually inspect references before deleting.

`cms_categories`

- `website_id`
- name
- slug
- description

`cms_authors`

- `website_id`
- name
- slug
- bio
- avatar image ID
- active flag

`cms_redirects`

- `website_id`
- from path
- destination URL/path
- redirect type: 301 or 302
- active flag
- hit count
- last hit time

`cms_site_settings`

- `website_id`
- robots.txt content
- sitemap settings
- SEO defaults
- site content/config values
- AdSense settings: Active/Inactive, publisher ID, auto-ads preference, optional `ads.txt`

Removed from v1:

- `cms_tags`
- `cms_post_tags`
- `cms_audit_events`

## Content Model

The CMS uses a hybrid content model.

Website code owns:

- routes
- layout
- page sections/components
- visual design
- blog page/post shell

CMS owns:

- editable text
- editable links
- editable image references
- template content fields
- blog article body HTML and legacy body blocks
- SEO fields
- sitemap include flags

For fixed pages such as home/about/contact/privacy/terms/packages:

- CMS stores one template content record per website/template.
- Public websites render template records using existing page components.
- Admin cannot create arbitrary layouts or new visual sections in v1.

For blog posts:

- CMS stores repeatable post records.
- Public websites render posts using their fixed blog layout.
- Admin composes the article body with the shared Tiptap editor.
- Admin selects one website-scoped author for each post.

Rules:

- CMS must not own public theme/layout.
- Page/post body HTML is explicitly chosen for editor content and must be sanitized before saving/rendering.
- Admin has an internal preview panel only.
- Public draft preview tokens are not included in v1.
- Revision history and rollback are not included in v1.
- Page/post future scheduling is not included in v1.

## Access Rules

### Admin Routes

Admin routes must:

- Require the existing `ADMIN_SECRET` session.
- Require selected `website_id` for website-scoped screens.
- Check `website_id` on every read/write.
- Reject cross-website edit/delete attempts.
- Allow the same slug on different websites.
- Block duplicate slugs within the same website.
- Use strict validation for slugs, ownership, redirect loops, image type/size, content schemas, editor HTML, legacy body blocks, and required fields.

Admin mutations use route handlers under `/api/cms/...`.

### Public Website Reads

Public websites use Supabase anon key and call public read-only RPCs/views.

Public reads should:

- Resolve the website by domain from `cms_website_domains`.
- Return only data for the resolved `website_id`.
- Return only active websites.
- Return template/post/page content for active websites, active authors, active redirects, safe public settings, and referenced media only.
- Return safe AdSense settings from `get_public_site_settings(domain)`.

Public reads rely on Supabase RLS and public RPCs so inactive website records and service-only fields cannot leak to public sites.

Recommended public interfaces:

- `get_public_site_by_domain(domain)`
- `get_public_template_content(domain, template_key)`
- `get_public_post(domain, slug)` for post detail lookup after the public route extracts the post slug
- `list_public_posts(domain, filters)`
- `list_public_categories(domain)`
- `list_public_authors(domain)`
- `get_public_site_settings(domain)`
- `list_public_redirects(domain)`

Public websites should prefer one RPC/view per page or screen to avoid many small queries.

## WordPress Import

The setup/provisioning project should support an initial one-time import from existing WordPress websites. The main CMS should not expose WordPress import UI or API routes.

Import source:

- WordPress REST API.
- Public WordPress REST data is used without credentials when available.
- Optional WordPress username and application password can be entered during import when REST data is protected or incomplete.
- OAuth client ID/client secret is not required in v1.
- WordPress import credentials are not stored in `.env` and are not stored permanently.
- If background import needs temporary credential persistence, encrypt credentials with `CMS_ENCRYPTION_KEY` and delete them after success, failure, or reset.
- Import reports, logs, public responses, and errors must never include WordPress credentials.

Import timing:

- One-time initial migration per website.
- Import is allowed only while `cms_websites.is_active = false`.
- After import and review, Supabase becomes the content source of truth.

Import entities:

- Published posts.
- Known published pages that map to supported template keys.
- Categories.
- Media/images.

Page import mapping:

- `/` -> `home`
- `/about` -> `about`
- `/contact` -> `contact`
- `/privacy` or `/privacy-policy` -> `privacy`
- `/terms` or `/terms-and-conditions` -> `terms`
- `/packages` -> `packages`

Unmatched WordPress pages:

- Import into `cms_pages` as custom pages when they can be represented safely.
- If a page cannot be imported safely, record it in the import report with a clear skipped reason.

Post import mapping:

- WordPress posts import into `cms_posts`.
- WordPress post content should be converted into `body_html` where practical, with supported `body_blocks` fallback when needed.
- If WordPress author data is unavailable, create/reuse `Imported Author`.
- If WordPress post category data is unavailable, create/reuse `Uncategorized`.
- Embedded images should be imported to Supabase Storage and rewritten.
- Headings, paragraphs, lists, tables, and images should be preserved in sanitized editor-compatible HTML where practical.
- FAQ-like content can be flagged for review if it cannot be safely represented.

SEO import:

- Try Yoast/RankMath metadata if exposed by the WordPress REST API.
- Fall back to WordPress title, excerpt, slug, content, and featured image fields.

Failed import behavior:

- If import fails halfway, clear all website-scoped data for that inactive website and rerun import.
- Clearing import data removes that inactive website's template content, posts, media, categories, authors, redirects, and settings as needed.
- Clearing import data also deletes that inactive website's imported Supabase Storage objects by using known `cms_media.storage_path` values or the `websites/{website_id}/...` prefix.
- Import progress and reports are tracked in a website-scoped `cms_import_jobs` table.
- The website row and domain setup should remain so the import can rerun for the same inactive website.
- This is a setup-only dangerous action.
- Active websites cannot be cleared/reimported in v1.
- UI must show strong warnings before clearing website import data.

Import report:

- Template content imported.
- Posts imported.
- Categories imported.
- Images copied.
- Inline image URLs rewritten.
- Unmatched WordPress pages.
- Skipped items.
- Failed media URLs.
- Error messages.

## Media And Supabase Storage

Use Supabase Storage as the v1 CMS media backend.

Media rules:

- Media is scoped by `website_id`.
- No shared/global media library.
- Use one public Supabase Storage bucket named `cms-media` for all CMS media.
- Separate websites by immutable website ID prefixes, not by separate buckets.
- Supabase Storage paths must use this pattern:

```text
websites/{website_id}/media/{yyyy}/{mm}/{uuid}.webp
```

- Use `website_id` in Supabase Storage paths because it does not change when website slugs or domains change.
- V1 stores one optimized public WebP object per media record. Thumbnail/object variants are deferred unless explicitly added later with matching metadata fields.
- Original filenames are stored only as metadata and are not trusted as unique object names.
- Uploads are converted/compressed to WebP.
- Public WebP uploads use Supabase Storage `cacheControl: '31536000'`.
- Image objects are immutable; replacing image content creates a new UUID storage path and updates CMS references instead of overwriting an existing public URL.
- Imported WordPress images are copied to Supabase Storage.
- Featured images and inline content images are copied.
- Old WordPress image URLs are rewritten to Supabase Storage public URLs.
- Public images are served through Supabase Storage generated public URLs/CDN.
- Signed URLs are not used for public website images in v1.
- Store media metadata in Supabase.
- Template/post JSON stores image references by `mediaId`; public RPCs resolve those IDs to image objects for the resolved `website_id`.
- Public websites consume resolved image URLs directly.
- Supabase service-role key must never be exposed to public websites.
- Public websites must not upload, delete, or list Supabase Storage objects. They only receive media URLs returned by public Supabase RPCs/views for their resolved `website_id`.
- Media picker screens only list `cms_media` rows for the selected `website_id`.
- Cross-website media selection is blocked.
- Failed or temporary upload objects should use a temporary prefix and be cleaned up separately from permanent media.

## SEO

Admin manually edits:

- SEO title.
- Meta description.

System handles:

- Canonical URL generated from domain/slug/path, with optional override.
- Sitemap generation from published content.
- Per-template/post sitemap include toggle.
- Robots.txt editable per website with a safe default.
- Open Graph/Twitter title and description from SEO fields.
- Admin-selectable Open Graph image.
- Basic automatic schema:
  - Article schema for posts.
  - WebPage schema for template content.
  - FAQ schema from supported editor/fallback FAQ content.

Not included in v1:

- SEO scoring.
- Plugin-style warnings.
- Manual schema builder.

## Quiz

Quiz remains global and separate from selected website context.

V1 behavior:

- Admin visits `/admin/quiz` without selecting a website.
- Website selection must not filter quiz targets.
- One quiz update applies to all websites.
- Admin edits one global 5-question quiz.
- Quiz data is stored in Supabase in a global table with no `website_id`.
- Public websites read the current published quiz from Supabase.
- Quiz code stays isolated from website-scoped CMS modules.
- Quiz storage contains only current quiz questions, publish state, and update timestamp.
- Quiz table does not store title, slug, description, visible date, SEO date, or page metadata.
- Homepage/page SEO is managed by website template/settings data, not by the quiz table.

Storage direction:

- Supabase is the quiz source of truth.
- Quiz remains global and must not add `website_id`.
- Public website rendering remains separate from the admin app.

## Admin Features

V1 admin features:

- Login.
- Website selector.
- Dashboard for selected website.
- Template Content Management for fixed pages.
- Posts CRUD with shared Tiptap visual editor, sanitized `body_html`, and legacy `body_blocks` fallback.
- Authors CRUD.
- Media library with WebP/Supabase Storage upload.
- Categories CRUD.
- Redirect manager.
- Site settings.
- SEO fields.
- Robots settings.
- Sitemap include controls.
- Global quiz page.
- Search and pagination.
- Permanent delete for deletable content resources after confirmation.
- Admin-only preview panel.
- Manual export for website data.
- Scheduled backup guidance in docs.

V1 setup/provisioning features:

- Add website.
- Edit website name/domain/status.
- Deactivate website.
- Create default `cms_website_domains` and `cms_site_settings` rows.
- Run WordPress import for inactive websites.
- Reset/retry WordPress import for inactive websites.

## Delete Behavior

For template content, posts, media, categories, authors, redirects, and other deletable content:

- Draft, unpublish, trash, and restore are not part of v1.
- Saves publish immediately.
- Delete permanently removes the row after admin confirmation.

Media delete rules:

- Media delete must first check references in posts, template content, featured images, Open Graph images, editor HTML image references, and legacy body block image references.
- If media is still referenced, delete is blocked and the admin sees where it is used.
- If media is unused, delete the Supabase Storage object first, then hard delete the `cms_media` row.
- If Supabase Storage deletion fails, keep the media row and show an error.

Author permanent delete rules:

- Authors are content records, not login users.
- Inactive authors are not selectable for new posts.
- Permanent author delete is blocked while posts reference the author, unless posts are reassigned first.

Website deletion is different:

- Websites are deactivated, not trashed or permanently deleted, in v1.

## Backup And Export

V1 includes:

- Manual export for website data.
- Scheduled backup guidance in docs.

Manual export should include:

- Website settings.
- Template content.
- Posts.
- Categories.
- Authors.
- Redirects.
- Media metadata.

Supabase Storage object backup/export can be documented separately because media files live outside Supabase Postgres.

## Security

V1 security model:

- Admin session check.
- Basic brute-force protection for `/api/admin/session` before real deployment.
- Server-side environment validation for required secrets.
- Server-only Supabase service-role usage.
- Public-read RLS.
- Public read-only RPCs/views.
- Strict resource validation.
- Supabase service-role key server-only.
- Stateless signed admin session cookie in v1; logout clears the current cookie, and server-side session revocation is deferred unless a session store is added.

Known security items not included in v1:

- Multi-user roles.
- CSRF hardening beyond default same-site session cookie behavior.
- IP allowlist.
- Rate limits on all mutations.
- Advanced audit/security workflow.

## Separation Of Concerns

Organize the code by feature and responsibility instead of putting everything in one page.

Recommended structure:

```text
app/
  (admin)/
    admin/
      page.jsx
      template-content/
      posts/
      authors/
      media/
      redirects/
      settings/
      quiz/
  api/
    admin/
    cms/
      websites/
      template-content/
      posts/
      authors/
      media/
      redirects/
      settings/

features/
  admin-shell/
  template-content/
  posts/
  authors/
  media/
  redirects/
  settings/
  quiz/

packages/
  cms-core/
    auth/
    supabase/
    storage/
    cms/
      repositories/
      validators/
      serializers/
      schemas/
      slug.js
      website-context.js
      public-read-model.js

supabase/
  # migrations are owned by setup-provisioning/

setup-provisioning/
  app/
    (admin)/admin/add-website/
    api/cms/websites/
    api/cms/import/
  features/
    websites/
    import/
  supabase/
    migrations/

docs/
```

Rules:

- UI components do not talk directly to Supabase.
- UI components do not talk directly to Supabase Storage.
- Route handlers call services/repositories.
- Validation lives in validators.
- Database access lives in repositories.
- Code-defined template schemas and post block schemas live under `packages/cms-core/cms/schemas/`.
- Supabase Storage upload/delete helpers live in `packages/cms-core/storage/`.
- Shared logic is imported as `cms-core/...` by both apps and bundled into each app at deployment time.
- Public read logic is separate from admin write logic.
- Import logic is separate from normal CRUD logic and lives in `setup-provisioning/`.
- Quiz logic stays isolated from CMS website-scoped logic.
- Large screens should be composed from smaller feature widgets.
- Shared helpers should stay focused and not become catch-all utility files.

## Admin Flow

- Admin logs in with `ADMIN_SECRET`.
- Admin creates/deactivates/imports websites in `setup-provisioning/`.
- New websites start inactive.
- Admin opens the main CMS after the website exists.
- Selected website appears in the URL, for example:

```text
/admin/template-content?websiteId=...
/admin/posts?websiteId=...
```

- Admin can switch existing websites from the main CMS admin shell.
- CMS screens reload based on selected `website_id`.
- Quiz page remains global:

```text
/admin/quiz
```

- Quiz does not depend on selected `website_id`.

## Public Website Integration

Each deployed website should:

- Use Supabase public/anon credentials.
- Resolve its current domain through public read RPCs/views.
- Fetch only public-safe CMS data for its resolved `website_id`.
- Fetch Supabase Storage public URLs from CMS media records.
- Fetch author display data from CMS author records where posts need it.
- Render template content and posts according to its existing UI/theme.
- Treat CMS data as content only, not as layout ownership.
- Cache public reads where possible.
- Expose a server-only revalidation webhook endpoint so the admin CMS can refresh cached pages after content, SEO, redirect, settings, AdSense, media, or author changes that affect public rendering.
- Render AdSense only when safe site settings say AdSense is active and a publisher ID is configured.
- Serve `/ads.txt` only when AdSense is active and `ads.txt` content exists.
- Keep revalidation webhook secrets per website in admin-only configuration or encrypted website settings.

The admin CMS manages:

- text
- links
- images
- fixed-template page content
- blog posts and article body HTML
- blog authors
- categories
- SEO metadata
- redirects
- AdSense settings
- website settings

The separate public websites own:

- layout
- frontend theme
- visual components
- visitor-facing rendering style

## Important Bug And Risk Protections

- Add unique constraints for domain and per-website slugs.
- Add unique constraints for `(website_id, template_key)`.
- Block reserved slugs such as `admin`, `api`, `blog`, `sitemap.xml`, `robots.txt`, and `_next`.
- Prevent redirect loops.
- Prevent duplicate redirect paths per website.
- Validate template `content_data` against code-defined schemas before saving.
- Validate post editor HTML and legacy `body_blocks` before saving.
- Block cross-website author selection and cross-website author avatar assignment.
- Block permanent author deletion while posts still reference the author.
- Do not expose Supabase service-role key to public websites.
- Keep media URLs safe for public use.
- Use one Supabase Storage bucket with `websites/{website_id}/...` storage path prefixes.
- Block cross-website media selection and cross-website media URL assignment.
- Block permanent media deletion while the media is still referenced.
- Public RPCs must resolve `mediaId` references to public image objects before returning template or post content.
- Trigger public website revalidation after content, SEO, redirect, settings, AdSense, or media changes that affect public rendering.
- Trigger public website revalidation after author changes that affect public posts.
- Add clear empty states for websites with no template content/posts/media.
- Keep quiz code separate from website-scoped CMS code.
- Avoid hidden selected-website state; use URL `websiteId` for clarity.
- Restrict destructive import reset to inactive websites only.

## Documentation Pack

Create and maintain documentation like the referenced project:

- `docs/INDEX.md`
- `docs/PROJECT_PLAN.md`
- `docs/DECISIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/RLS_POLICIES.md`
- `docs/API_CONTRACTS.md`
- `docs/USER_FLOWS.md`
- `docs/IMPLEMENTATION_GUIDE.md`
- `docs/IMPLEMENTATION_CONTEXT.md`
- `docs/IMPLEMENTATION_MILESTONES.md`
- `docs/SETUP.md`
- `docs/TESTING.md`

Do not create `docs/PRODUCT_SPEC.md` in the first documentation phase. `PROJECT_PLAN.md` already owns product scope. Add a product-only spec later only if non-technical product documentation becomes useful.

Docs must clearly explain:

- admin app is separate,
- websites are separate,
- websites read Supabase via public read-only RPCs/views,
- media is stored in Supabase Storage,
- Supabase Storage uses one bucket with `websites/{website_id}/...` prefixes,
- `website_id` scopes all normal CMS resources,
- template content replaces generic pages,
- post bodies use sanitized Tiptap `body_html`, with structured `body_blocks` only for legacy/import fallback,
- authors are website-scoped blog profile records,
- quiz is global,
- code must stay feature-separated,
- WordPress import is inactive-website setup flow only.

Recommended next documentation phase:

1. `docs/INDEX.md`
2. `docs/DECISIONS.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DATA_MODEL.md`
5. `docs/RLS_POLICIES.md`
6. `docs/API_CONTRACTS.md`
7. `docs/USER_FLOWS.md`
8. `docs/IMPLEMENTATION_GUIDE.md`
9. `docs/IMPLEMENTATION_CONTEXT.md`
10. `docs/IMPLEMENTATION_MILESTONES.md`
11. `docs/SETUP.md`
12. `docs/TESTING.md`

## Test Plan

Required tests:

- Admin login/session.
- Website creation with required name/domain in `setup-provisioning/`.
- Auto-generated website slug.
- New websites start inactive.
- Website deactivation hides public content.
- Website selection by URL `websiteId`.
- Website domain lookup through public RPC/view.
- Template content filtering by `website_id`.
- Post filtering by `website_id`.
- Media filtering by `website_id`.
- Category filtering by `website_id`.
- Author filtering by `website_id`.
- Redirect filtering by `website_id`.
- Settings filtering by `website_id`.
- Cross-website edit/delete rejection.
- Same slug across different websites.
- Duplicate slug rejection within the same website.
- Unique `(website_id, template_key)` enforcement.
- Public read queries only return public-safe CMS data.
- Publish-only content saves.
- Permanent delete after confirmation.
- Redirect duplicate prevention.
- Redirect loop prevention.
- Template content schema validation.
- Post body HTML and legacy body block validation.
- Author CRUD.
- Author slug uniqueness per website.
- Author avatar image ownership validation.
- Author picker only shows selected website authors.
- Cross-website author assignment rejection.
- Referenced author permanent delete is blocked.
- TOC placeholder generated from headings.
- FAQ block schema generation.
- Media upload and WebP optimization.
- Supabase Storage metadata storage.
- Supabase Storage path uses `websites/{website_id}/media/{yyyy}/{mm}/{uuid}.webp`.
- Media picker only shows selected website media.
- Cross-website media assignment is rejected.
- Permanent media delete is blocked when media is still referenced.
- Permanent media delete removes unused Supabase Storage object.
- WordPress REST import for inactive websites in `setup-provisioning/`.
- Import blocks active websites.
- Failed import reset clears inactive website-scoped data only.
- Failed import reset deletes only that inactive website's Supabase Storage objects.
- WordPress image copy to Supabase Storage.
- Inline WordPress image URL rewriting.
- WordPress known page path to template mapping.
- WordPress unmatched pages import into `cms_pages` as custom pages or are reported with a clear skipped reason.
- SEO canonical/sitemap/robots/OG/schema behavior.
- AdSense defaults inactive for new websites.
- AdSense cannot be enabled without a valid `ca-pub-...` publisher ID.
- AdSense Active/Inactive changes affect public settings and trigger revalidation.
- Public website revalidation webhook is called after public-facing changes.
- Quiz remains global and independent of selected website.
- Quiz storage contains only current quiz questions, publish state, and update timestamp.
- Quiz SEO/page metadata is managed by website template/settings data.

Required checks:

```powershell
npm test
npm run lint
npm run build
```
