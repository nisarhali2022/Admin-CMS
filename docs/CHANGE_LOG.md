# CMS Rebuild Change Log

## 2026-07-18 - Production Cutover And Global Quiz Freshness

- Saving the global quiz now revalidates every active website with a configured
  public webhook after the Supabase write succeeds.
- The webhook event is `global_quiz.updated` and invalidates Home, the page
  sitemap, and the sitemap index without rolling back a successfully saved quiz
  when a website endpoint fails.
- Documented the Supabase-only Vercel cutover, CMS domain rename, root-domain
  canonical rule, required secrets, DNS safety, and rollback procedure.

## 2026-07-18 - SEO, Performance, and Technical Hardening

- Set the reference frontend's single crawler-facing origin to `https://telenorquiztoday.com.pk`; local `CMS_SITE_DOMAIN` continues selecting public CMS content only.
- Updated sitemap, sitemap-index, and default robots sitemap URL generation to use the configured public origin.
- Made Organization and Article publisher JSON-LD logos absolute URLs.
- Added request-scoped caching for singular public CMS reads, redirect exclusion regression coverage, security headers, optional staging CSP report-only mode, and a read-only public CMS image-dimension audit script.
- No CMS content, public RPC contract, database record, or deployment configuration was changed.
- Rechecked locally: 79 frontend tests, lint, and 13 documentation-readiness tests passed. Representative public routes use one production canonical, `index,follow`, and one H1; the media audit found zero missing dimensions across 114 image-bearing resources.

This file records the major product, architecture, schema, UI, and documentation changes made during the CMS rebuild planning and implementation. It is intended as a readable handoff summary, not a runtime audit log.

## 2026-07-17: Header Current-Menu Button

- Added a shared client navigation component for the public header. It highlights the current desktop and mobile menu item with a filled primary button and sets `aria-current="page"` for assistive technology.
- Blog and category article routes retain the correct parent-menu selection; Home remains exact-path only.

## 2026-07-17: Accurate Public Post Reading-Time Labels

- Added `202607170001_public_post_reading_time.sql`, which extends the existing anon-safe paginated post RPC with derived `readingTimeMinutes` at 200 words per minute.
- The list RPC remains lightweight and does not return article bodies. Frontend cards now use the server-provided value and retain their local word-count helper only as a fallback for full post details or older responses.

## 2026-07-17: True WordPress Publication-Date Ordering

- WordPress imports now preserve each source post's original `date_gmt` or `date` in `cms_posts.published_at`.
- Editing an existing post no longer resets its publication date; newly created CMS posts still start with the current time.
- Added a dry-run-first repair utility for existing imported posts. It matches by slug, updates only publication timestamps when explicitly applied, and revalidates Home, Blog, and affected category archives.
- Public RPC and frontend order remain `published_at` newest first, then creation date. Latest News, Recent Posts, Popular Posts, Blog, and category archives therefore use the true original newest-post order.

## 2026-07-16: Homepage and Sidebar Post Display

- Homepage Latest News now fetches the 30 newest public posts and selects six unique cards after client hydration, creating a fresh selection on a full browser refresh without a hydration mismatch.

## 2026-07-18 - Latest News fixed newest cards

- Latest News now keeps the newest two published posts in cards 1 and 2.
- Cards 3 through 6 select four unique random posts from the remaining newest-30 candidate pool after client hydration and on each full browser refresh.
- The sidebar keeps the five newest public posts in strict newest-first order as Recent Posts.
- Renamed More Posts to Popular Posts. It now selects five unique posts from the remaining newest-30 candidate pool and cannot repeat a Recent Post. This is a rotating recent-post list, not an analytics ranking.
- Blog and category archives remain unchanged and keep the public RPC order: `published_at` newest first, then `created_at`.

## 2026-07-16: Six-Hour SEO Date And Midnight Visible Home Date

- Separated Home date modes: the manual H1 and daily quiz H2 use the current Karachi date, while Home metadata, WebPage JSON-LD, and Home sitemap freshness use a Karachi date six hours ahead.
- Added `202607160002_home_visible_date_tokens.sql`, an idempotent local-website migration that changes only the literal dates in the existing Home H1 and `Today Telenor Answer` H2 to `{date}`.
- Added protected `/api/cron/seo-refresh` alongside the midnight route. Both refresh Home and its two sitemap routes; Vercel schedules the early SEO refresh at 13:00 UTC and visible-date refresh at 19:00 UTC.
- Strengthened Home editor warnings so a literal date in either dated heading is reported without blocking a save.

## 2026-07-16: Local CMS Content Quality, SEO, Sitemap, And Redirect Performance

- Added Home `{date}` rendering before manual rich-content splitting so the public daily H1, SEO content, table of contents, quiz placement, and WebPage JSON-LD stay aligned.
- Added CMS metadata support for saved canonical URLs, robots values, and OG images with safe generated defaults when a CMS field is empty.
- Added non-blocking Post and Page/Template content checks for focus keyphrase, advisory title/description lengths, image alt text, link destinations, heading hierarchy, and Home date placeholders.
- Added migration `202607160001_local_seo_quality_and_redirect_lookup.sql`: exact anon redirect lookup RPC and index, canonical fixed-template paths, sitemap/noindex repair for legacy/404 pages, two missing fixed-page descriptions, and Home-image fallback for blank public OG images.
- The same migration changes only the literal date inside the existing Home H1 for `test.telenorquiztoday.com.pk` to `{date}`; no other Home paragraphs or headings are rewritten.
- Custom Pages do not have a separate `og_image_id` in the deployed schema, so their blank social-image fallback writes `featured_image_id` instead.
- Updated sitemap normalization to emit canonical fixed-page paths only, remove duplicates, and exclude non-indexable CMS paths.
- Updated frontend redirect middleware to use `get_public_redirect` instead of loading all redirect rules on every request.
- Added focused frontend/Admin CMS test coverage and refreshed the owning documentation set.

## 2026-07-14: Public Frontend Cutover Implementation

- Added editable Home template text, sanitized HTML, repeatable quiz information/steps/FAQ controls, default JSON contract migration, and a guarded staging-only seed script.
- Added anon-safe paginated posts, author, category-count, and published content-index RPCs; hardened each new query against inactive, unpublished, and deleted data.
- Added public route collision checks and database reserved-route constraints.
- Migrated the reference public Next.js site to local `lib/cms/` RPC helpers, Supabase Storage images, CMS quiz/home content, CMS settings/AdSense/ads.txt/robots/sitemap/redirects, and CMS revalidation.
- Removed its WordPress runtime, tag archive, frontend quiz editor, credentials, scripts, and legacy tests.
- Replaced non-portable migration-document links with repository-relative links and added readiness coverage for portable local-helper guidance.
- Added `docs/migration-baseline.md` as the required staging/rollback comparison record. No migration, import, seed, activation, or production deployment was executed during this code change.

### Route Guard Migration Compatibility Correction

- Updated `202607140003_route_guards.sql` to use conditional `NOT VALID` constraints so existing imported rows with reserved paths do not block migration application.
- The database still validates every new or changed row; CMS services continue to reject reserved paths and cross-resource public route collisions.

### Staging Seed Environment Compatibility

- Updated the Home seed script to accept the Admin CMS project's existing `NEXT_PUBLIC_SUPABASE_URL` as a safe fallback for `SUPABASE_URL`; the service-role key and selected `CMS_SITE_DOMAIN` remain required server-side inputs.

### Frontend AdSense Client-Boundary Correction (2026-07-15)

- Marked the `AdBanner` and `AdInArticle` wrappers as Client Components because they consume the client-only `useAdSenseSettings()` context hook.
- Prevented server-rendered homepage and article routes from calling a client hook directly. Local `/`, `/blog`, `/search`, `robots.txt`, and sitemap responses returned HTTP 200 after the correction. Fixed/custom pages and category routes remain 404 until their CMS content is imported or provisioned; `ads.txt` remains 404 until AdSense is enabled.

### Migration Website WordPress Import (2026-07-15)

- Completed a WordPress import into the inactive migration website: 107 posts, 7 CMS pages, 7 categories, 1 author, and 137 image assets; no import errors or warnings were reported.
- The source `/blog` Page was intentionally skipped because `/blog` is the reserved frontend archive route. The source had two MP4 assets, which remain a follow-up because the image importer accepts image types only.
- Yoast REST Bridge metadata was detected. Homepage rich-content seeding remains intentionally deferred.

### Legacy Fixed-Page Import Path Correction (2026-07-15)

- Corrected WordPress import handling for `/about-us`, `/contact-us`, and `/privacy-policy`, so each is stored as its matching fixed template instead of an unreachable custom page.
- Added `202607150001_preserve_fixed_page_legacy_paths.sql` to promote already-imported matching custom pages, preserve their content/SEO/media metadata, and remove their superseded custom-page rows from public indexes.
- Future imports now keep these legacy URLs as the template default paths. Apply the new migration before retesting the imported Contact page.

### WordPress Imported Content Publishing Correction (2026-07-15)

- Reconciled the CMS as genuinely publish-only: Content `status` columns are removed from Posts, Pages, and Templates, and the importer/repositories no longer persist or expose draft state.
- Added `202607150003_reconcile_publish_only_content.sql`, which repairs legacy fixed pages, rebuilds all relevant public RPCs without status filters, and removes the columns. It makes already-imported posts public without publishing unrelated records through a hidden status transition.
- The interim `202607150002_publish_wordpress_imported_content.sql` remains safe for projects that already ran it, but is superseded by `202607150003` for this migration website.

### Local Migration Validation and Sitemap Domain Correction (2026-07-15)

- Applied and validated the publish-only reconciliation locally. The imported blog, category, search, Contact page, robots, sitemap index, and child sitemap routes return HTTP 200.
- Confirmed 107 imported post URLs plus the blog archive in `post-sitemap.xml` (108 entries total), and confirmed an imported post renders body content.
- Updated the blog-archive sitemap entry to use the request/CMS domain rather than a hard-coded production domain; all local sitemap URLs now use `test.telenorquiztoday.com.pk`.

### Home Template Seed Readiness (2026-07-15)

- Changed `setup-provisioning/scripts/seed-telenor-home-content.mjs` to create an intentionally empty Home template instead of copying legacy frontend content.
- The guarded script still creates the missing fixed Home template when run with `--apply`; it selects the imported active author and an imported post featured image to satisfy the CMS template contract. It still makes no write unless `--apply` is supplied and always refuses an active website.
- The public frontend now recognizes an intentionally empty Home template and returns no legacy homepage content. An initial dry run confirmed the template could be created; the latest read-only run confirms the template now exists and the revised seed will clear its visitor-facing content. Applying the seed and re-activating the website remain an explicit operator action.
- Connected the Home template's visual rich-text editor (`Hero Text`) to the public homepage. When a Home template exists, individual empty CMS sections no longer reintroduce the old hard-coded homepage fallback. The editor now labels this field as homepage content.
- Removed the separate `Homepage sections` controls from the Home editor. The daily quiz heading and cards now remain on the homepage automatically from the global Quiz CMS data, while all manual homepage text is managed in the single visual editor.
- Increased the Home rich-text field limit from 5,000 to 100,000 characters and made the server sanitize that HTML before storage. This supports a complete manually authored homepage while preserving the existing shorter limits for other template fields.
- Updated the public homepage layout to preserve the exact rich-text content authored in Home. The global Quiz CMS cards are inserted immediately after the editor heading that starts `Today Telenor Answer`, followed by six Latest News cards; the remaining manual content renders unchanged below those cards.

## Current Direction

- The project is a single-admin, multi-website CMS.
- One admin user signs in with the configured admin secret.
- After login, normal CMS resources are managed per selected website.
- Website setup/provisioning now lives in `setup-provisioning/`.
- `setup-provisioning/` owns migrations, website creation/edit/deactivation, default setup rows, and WordPress import.
- The main Admin CMS consumes existing website records and no longer exposes add-website or WordPress import screens.
- Website-scoped resources use `website_id` as the foreign key.
- Quiz remains global and is not scoped by website.
- Public websites are separate apps and read public-safe data from Supabase.
- Supabase is used for database, auth/session support, and media storage.
- Supabase Storage replaced Cloudflare R2 for v1 media.
- New post edits use sanitized Tiptap `body_html`; legacy `body_blocks` are fallback/import compatibility only.
- Individual public post URLs use `/{categorySlug}/{postSlug}`. `/blog` is the archive/list page only.
- New post saves require both Author and Category. WordPress import falls back to `Imported Author` and `Uncategorized` when source data is missing.
- Category editing now uses the top Add/Edit Category form; table rows remain display-only.
- Pages and Posts now show Focus keyphrase, SEO title, and Meta description as separate table columns, and Author is managed in the right editor settings card.
- Page, Post, and shared Tiptap image dialogs now support automatic media search. Image presets are labeled `S`, `M`, and `L` while retaining 300px, 600px, and full-width behavior.
- Removed the CMS post `excerpt` field from the active UI, API, public RPCs, database schema, and import metadata fallback. Yoast metadata remains the supported SEO source.
- Pages and Posts editors now stack Focus keyphrase, SEO title, and Meta description vertically, place Feature Image in its own settings row, and show only SEO title in their list tables.
- Added `FRONTEND_WORDPRESS_TO_SUPABASE_MIGRATION.md`, the reusable direct-cutover guide for replacing WordPress REST reads in a public Next.js website with Supabase public RPC reads.
- Active CMS behavior is publish-only and permanent-delete only; draft, trash, restore, move-to-trash, and unpublish workflows are removed from the active product.

## WordPress Import-Only Field Rules

- WordPress import no longer requires SEO title, meta description, or featured image fields.
- Missing imported images remain empty instead of receiving an unrelated fallback image.
- Imported meta descriptions are decoded and capped at 300 characters when present; missing descriptions remain `null`.
- Normal manual Page and Post saves remain strict and keep their existing required-field validation.
- WordPress REST collections now paginate automatically in 100-item batches, so one import action fetches all posts, pages, categories, users, and media records.
- The importer uses `X-WP-TotalPages` when available and otherwise stops after a short final batch, with a bounded safety limit for malformed endpoints.

## WordPress-Style Media Filenames

- New uploads and WordPress imports now store readable sanitized filenames as optimized `.webp` object names.
- Same-month filename collisions receive numeric suffixes such as `image-2.webp`; existing objects are never overwritten.
- Added a setup-only migration action for existing UUID media objects, preserving media IDs and content references while updating Storage paths and public URLs.
- Added the corrective `202607120001_media_storage_filename_paths.sql` migration so existing Supabase projects accept both legacy UUID filenames and new readable filenames.

## Yoast SEO Import

- Added the WordPress CMS Yoast REST Bridge for Focus keyphrase, SEO title, and raw meta description values.
- WordPress imports now prefer Yoast SEO metadata and report the source used for imported SEO fields.
- Missing bridge data safely falls back to generated Yoast head metadata. The later post-excerpt removal correction supersedes the historical WordPress excerpt fallback.

## WordPress Author Bios

- WordPress user descriptions are now imported into website-scoped author bios after safe HTML cleanup and 2,000-character truncation.

## Imported Content Links

- WordPress imports now preserve safe rich HTML in Posts and custom Pages instead of reducing links to plain text.
- Internal WordPress/source-domain links become relative CMS paths, external links remain intact, and imported inline images use Supabase Storage URLs with media IDs.

## Documentation Alignment: Latest Post And Import Contracts

- Normalized docs around Tiptap `body_html` as the preferred post body and `body_blocks` as legacy/import fallback.
- Documented category-based post URLs consistently across planning, API, testing, and public-site integration docs.
- Clarified that `/blog` remains only the archive/list path.
- Clarified required Author and Category validation for new post saves.
- Clarified WordPress fallback records: `Imported Author` and `Uncategorized`.
- Marked older duplicate-page guidance as superseded by the `cms_pages` custom-page model.

Note: older entries below record the path taken during implementation. Any older mention of bulk trash/restore, media trash filters, draft/unpublish, optional post category, `/blog/{postSlug}` detail URLs, body-block-first editing, or Pages without View actions is superseded by the current direction above and the later correction entries.

## Latest UI Corrections

- Categories now use a desktop 40% / 60% management layout with the Add Category form on the left and the category table/search area on the right.
- Categories search now filters automatically while typing, and the table shows Name, Slug, Count, and Actions without a Description column.
- Dashboard is now website-scoped and shows selected-website metrics for pages, posts, media image count, and total optimized image storage, with simple built-in chart visuals.
- Dashboard now also shows shared Supabase Storage usage for the `cms-media` bucket, including total media files, used storage, configured remaining storage, and an estimated usage bar.
- Pages and Posts editor links now render orange, bold, and underlined in the shared Tiptap content styling.
- Pages and Posts editor heading controls include H1, H2, H3, and H4, with heading styles centralized in `styles/globals.css`.
- Pages and Posts editor content areas now use a fixed 600px editing height with internal scrolling.
- Pages and Posts now require Feature Image, SEO title, Meta description, and Author before save.
- Pages and Posts Focus keyphrase accepts 1 to 3 comma-separated keyphrases.
- Posts now store `focus_keyphrase` through a setup/provisioning migration and expose `focusKeyphrase` through admin/public serializers.
- Pages block duplicate titles within the selected website across custom pages and fixed template content.
- Posts block duplicate titles and duplicate category-based URLs within the selected website.
- Authors now select images through a `Select author image` dialog with a scrollable media list, and table Edit fills the top `Edit Author` form instead of opening inline table inputs.
- Authors table no longer shows the Bio column; Bio remains available in the add/edit form.
- Posts now mirror the current Pages list behavior: automatic search, `Add Post` in the toolbar row, bulk permanent delete, `Meta title` before `Author`, and row `View` before `Delete`.
- The Posts Feature Image selector now uses the same `Select feature image` dialog pattern as Pages, with a scrollable media list capped around 500px.
- Posts continue to use the shared Tiptap editor, so the latest Add Media popup, Small/Medium/Large image presets, image resizing, and fixed Code mode apply to both Pages and Posts.

## Website And Resource Scoping

- Added website/account management as a core CMS concept.
- Websites are provisioned in the setup project.
- Admin can select a website after login.
- Website selection controls website-scoped resources only.
- Website-scoped resources include:
  - media
  - template content/pages
  - blog posts
  - categories
  - authors
  - redirects
  - settings
  - SEO

## Setup Project Split

- Created `setup-provisioning/` as the setup/provisioning project boundary.
- Moved Supabase migrations into `setup-provisioning/supabase/migrations`.
- Moved website add/edit/deactivate UI and WordPress import UI/API into `setup-provisioning/`.
- Main CMS keeps read-only website listing for the header dropdown.
- Main CMS keeps daily content editing for media, pages, posts, categories, authors, redirects, settings, and quiz.
  - AdSense
  - WordPress import jobs
- Quiz is intentionally excluded from website scoping.
- The selected website is preserved across website-scoped admin pages through `websiteId`.

## WordPress Import Requirement Normalization

- Kept strict required SEO and feature-image validation for normal Pages and Posts saves.
- Updated WordPress import to trim decoded meta descriptions to the CMS 300-character limit instead of skipping otherwise valid content.
- Updated import to use a deterministic successfully imported media fallback when a WordPress page or post has no featured image, so imported content still satisfies the required feature-image contract.
- The import report continues to list genuinely unavailable or failed records in `skippedItems`.

## Quiz Changes

- Quiz is global.
- Quiz has no `website_id`.
- Quiz does not depend on selected website.
- One quiz update applies to all public websites.
- Quiz is stored in Supabase in `cms_global_quiz`.
- Quiz table was simplified to current-only data:
  - `quiz_id`
  - `questions`
  - `is_published`
  - `updated_at`
- Removed quiz table fields:
  - `title`
  - `slug`
  - `description`
  - `visible_date`
  - `seo_date`
  - `created_at`
- Homepage/page SEO is managed by website template/settings data, not by the quiz table.
- Added compatibility for older Supabase tables that still use `id` before the corrective `quiz_id` migration is applied.
- Added `cms_public_get_current_quiz()` for public quiz reads.
- Added service-role execute permission for `cms_global_quiz_questions_valid(jsonb)`.
- Added corrective migration:
  - `supabase/migrations/202607050009_fix_quiz_function_permissions.sql`
- Quiz UI now follows the old quiz admin reference style more closely:
  - 5 question cards
  - question text field
  - 4 options
  - A/B/C/D answer selectors
  - green selected answer state
  - answer preview
  - save button
  - clear all button
- Typing option text no longer auto-selects an answer.
- User selects the correct answer by clicking the option selector button.
- If a selected option text is edited, the answer remains linked to that selected option.

## Admin UI And Navigation

- Login page no longer shows the admin header/sidebar.
- After login, the admin lands on `/admin/quiz`.
- Admin UI was redesigned toward a Hostinger-inspired light admin layout.
- Website-scoped CMS pages have a light left sidebar.
- Sidebar remains visible on website-scoped admin pages.
- Sidebar is hidden on `/admin/quiz` and `/admin/add-website`.
- Quiz link was removed from the left sidebar.
- Quiz is now linked from the top header.
- Add Website is a standalone header page at `/admin/add-website`.
- `/admin` is now a selected-website Dashboard with content metrics and shared CMS Storage usage.
- Website creation, selection/editing details, activation, and deactivation live only on `/admin/add-website`.
- WordPress import now lives inside Website Workspace on `/admin/add-website`, after a website is selected.
- Normal website-scoped CMS menu pages render only their resource UI and no longer show the repeated website workspace, website list, Add Website card, or Selected Website card.
- The header title shows only the selected website name when `websiteId` is selected.
- Quiz remains global and keeps `Quiz Update` as its header title.
- Top header includes:
  - current section title
  - Quiz link
  - website dropdown
  - Add Website button
  - Sign out button
- Header layout uses title on the left, website dropdown centered, and actions on the right.
- Admin UI base font size is 15px.
- Website dropdown routes to `/admin?websiteId=<id>`.
- Add Website routes to `/admin/add-website`.
- Creating a new website keeps the admin on `/admin/add-website?websiteId=<new-id>` so setup/import can continue.

## Supabase Storage Changes

- Cloudflare R2 was removed from the v1 plan.
- Supabase Storage is now the only v1 media backend.
- Recommended bucket name is `cms-media`.
- Media files are stored under website-scoped paths:
  - `websites/{website_id}/media/{yyyy}/{mm}/{filename}.webp`
- Public images are stored as WebP.
- `cms_media` stores:
  - `storage_path`
  - `public_url`
  - alt text
  - caption
  - dimensions
  - MIME type
  - file size
  - source
- Public APIs resolve `mediaId` values into image objects with URL and metadata.
- Public websites never upload, delete, or list storage objects directly.
- Upload/delete operations happen through trusted server/admin code.

## Blog And Content Changes

- Blog posts are website-scoped.
- Blog posts require an author.
- Authors are website-scoped profile records, not login users.
- Admin can create, edit, and delete authors.
- Categories are supported.
- Tags were removed from v1.
- Blog layouts are fixed.
- Blog body content now uses sanitized Tiptap HTML for new edits.
- Legacy body blocks remain as import/backward-compatibility fallback content.
- Images can be placed anywhere in the blog body through the Media Library picker.
- Fixed template content uses code-defined templates in `cms_template_content`.
- WordPress-style custom pages use `cms_pages`, so Add Page creates a new page row instead of consuming or replacing Home/About/Contact template slots.
- No drag-and-drop page builder is included in v1; Pages use a Tiptap HTML editor for formatted content.
- No revisions are included in v1.
- No public draft preview tokens are included in v1.
- Internal admin preview is included for template content.

## SEO And Settings

- SEO fields remain per template/page content and per blog post.
- Supported SEO fields include:
  - SEO title
  - meta description
  - canonical URL
  - robots meta
  - Open Graph image
- Website-level settings include:
  - robots.txt
  - sitemap settings
  - SEO defaults
  - site config
  - revalidation settings
  - AdSense settings
- Website-level AdSense control was added.
- AdSense is configured in `cms_site_settings`, not `.env`.
- New websites default AdSense to inactive.
- Enabling AdSense requires a valid `ca-pub-...` publisher ID.
- Public websites render AdSense only when enabled and configured.
- `/ads.txt` is exposed only when AdSense is enabled and configured.

## Redirects

- Redirects are website-scoped.
- Supports 301 and 302 redirects.
- Duplicate redirect rules are prevented.
- Redirects have active/inactive behavior.
- Public redirect reads expose only active, non-deleted redirects.
- Redirect hit tracking fields may exist, but public anon clients do not update them in v1.

## WordPress Import

- WordPress import is website-scoped.
- Import is allowed only for inactive websites.
- WordPress import is opened from Website Workspace, not from the left sidebar.
- Import progress is stored in `cms_import_jobs.report.progress` and shown as a progress bar while import is running.
- WordPress posts, categories, authors, pages, and images are imported where possible.
- WordPress authors are imported into `cms_authors`.
- If WordPress author data is unavailable, a website-scoped fallback author named `Imported Author` is used.
- Posts are never imported without `author_id`.
- Imported images are copied into Supabase Storage.
- Old WordPress image URLs are rewritten to Supabase Storage public URLs.
- Failed import reset clears only the inactive website's scoped rows and imported Supabase Storage objects.

## Security And Access

- One admin user in v1.
- Admin writes happen through server route handlers.
- Supabase service-role key remains server-only.
- Public websites use Supabase anon credentials only for public-safe RPCs.
- Direct anon table access is closed with RLS.
- Public RPCs expose only active/published/safe data.
- Import jobs are admin-only.
- Revalidation secrets are encrypted with server-only `CMS_ENCRYPTION_KEY`.

## Documentation Flow

- Added and maintained detailed docs under `docs/`.
- Added milestone implementation plan.
- Added implementation context and implementation details docs.
- Added milestone review flow.
- `docs/MILESTONE_REVIEWS.md` must be updated after each completed milestone.
- Future milestones should read the latest milestone review before starting.
- This `docs/CHANGE_LOG.md` records major decisions and corrections across the rebuild.

## Admin Category UI

- Categories now use a WordPress-style taxonomy management layout.
- The category model remains flat in v1; no parent category hierarchy was added.
- The category screen has an add form, client-side search, bulk trash/restore, row edit actions, and post count display.
- Admin input/select/textarea and button text was reduced by 1px after the Hostinger-style pass.
- The duplicate bottom category bulk-action toolbar was removed; only the top toolbar remains.
- Authors now use the same WordPress-style taxonomy management layout, with avatar, active status, search, bulk trash/restore, and post count display.
- Website Workspace create/update/deactivate now refreshes the header website dropdown without requiring a manual browser refresh.
- Author image selection now shows a live preview from existing Media Library images and a user placeholder when no image is selected.
- Clicking a website inside Website Workspace now also refreshes the header dropdown/title context.
- Author row actions now live in a dedicated `Actions` column after `Count`.
- Redirects now use the same WordPress-style management structure as Categories, with add form, search, bulk trash/restore, and table actions.
- Settings now use stable full-width section panels instead of the tab layout that collapsed JSON fields into a narrow column.
- Category row actions now also live in a dedicated `Actions` column after `Count`.
- Redirects now stack the add form above the search/table row instead of using a side-by-side add/table layout.
- Categories and Authors now also use stacked full-width add-form and table rows instead of side-by-side columns.
- Redirect source paths now accept pasted full source URLs and normalize them to relative paths before saving.
- Category and Author add forms now place `Name` and `Slug` side by side on wider screens.
- The Author add form now also places `Bio` and `Author Image` side by side on wider screens.
- Media upload now resets a captured form reference after success, avoiding the `event.currentTarget.reset()` null crash.
- Media Library now uses a WordPress-style table/list view with thumbnail rows, a dedicated `Alt text` column, no `Uploaded to` column, a final `Actions` column with usage feedback, search, bulk permanent delete, inline alt/caption editing, URL copy, and media actions.
- Media Library no longer shows the placeholder `Author` column; it now shows optimized WebP `File size` and `Dimensions` columns from stored media metadata.
- Media uploads keep using server-side `sharp` conversion/compression so PNG/JPG inputs are stored as optimized WebP files; images wider than 1200px are resized down to 1200px without upscaling smaller images.
- The Media table now shows the stored `.webp` filename/type separately from the `Uploaded as` source filename.
- Media Library no longer shows the unused list/grid view controls, `All media items` dropdown, date dropdown, or `Filter` button.
- Media with empty alt text now falls back to the uploaded filename, and new uploads/imports save that filename fallback.
- Media downloads now use a blob-based browser download handler instead of relying on cross-origin link download behavior.
- Media search now filters automatically while typing, and the Media table supports checkbox selection plus bulk permanent delete through the existing safe delete endpoint. The visible `Usage` action remains available for manual reference checks.
- Media search now sits in a centered row above the bulk-action toolbar.
- Categories, Authors, and Redirects no longer render duplicate table footer headers, and their table body text now uses normal black styling.
- Template Content is now presented as a WordPress-style Pages screen: a table of fixed pages first, then an Edit Page view after clicking a title.
- Template pages now support `focus_keyphrase` and required same-website `author_id`; the editor shows Focus keyphrase, SEO title, Meta description, and Author below the content box.
- Pages table now includes an `Actions` column with Edit, Trash/Restore, and View.
- Page editor toolbar buttons, Add Media, and Visual/Code tabs now perform visible editor actions instead of acting as static controls.
- Page editor now labels the URL field as `Slug`, shows `Feature Image` instead of `Open Graph image`, and prevents `Add Page` from opening an existing page when all fixed pages already exist.
- Pages trash actions now return to the Trash list, Add Page opens with blank visible fields, editor screens no longer show another Add Page button, and Feature Image uses an in-page media picker button.
- Pages UI was simplified to publish/delete only at this stage: no Draft, Trash, Restore, Move to Trash, Unpublish, status dropdown, or bulk trash controls. Saves publish pages, and Delete uses the permanent delete route after confirmation. A later correction reintroduced `View` actions without bringing back draft/trash workflows.
- Pages now load hidden legacy rows only for fixed-template existence checks, preventing Add Page from creating duplicate template keys while keeping hidden rows out of the visible table. Slug collisions also show a clearer message before save.
- Global publish-only cleanup removed Draft, Trash, Restore, Move to Trash, and Unpublish behavior from all active CMS resources.
- Categories, Authors, Redirects, Posts, Pages, Template Content, and Media now use direct permanent delete actions after confirmation.
- Removed trash/restore/unpublish/publish API route handlers from the main CMS.
- Added setup/provisioning migration `202607080002_remove_draft_trash_restore.sql` to delete legacy hidden/non-published rows, drop content `status` and `deleted_at` columns, replace partial unique indexes, and update public/admin SQL functions.
- WordPress import now skips non-published WordPress pages/posts and reports them instead of importing them as drafts.
- Media delete keeps the safe reference check and deletes the Supabase Storage object before deleting metadata when unused.
- Pages now show `View` before `Delete` in the table Actions column and on Add/Edit screens, using the selected website's primary domain plus the page slug.
- Pages list now supports automatic search, `Meta title` before `Author`, checkbox selection, and bulk permanent delete through existing page/template delete endpoints; Add Page moved into the list toolbar opposite search.
- Pages Feature Image selection now opens a modal popup using the shared dialog component instead of expanding an inline picker inside the settings card.
- Pages Feature Image popup now uses a wider dialog with a media list that scrolls after about 500px.
- The Pages content area now uses a WordPress-like visual editor with working toolbar actions, Code mode for sanitized HTML, and an Add Media picker that inserts selected images.
- The Pages editor now places the SEO card and page settings/feature-image card in one responsive two-column row.
- The Pages visual editor now uses Tiptap open-source editor packages instead of the previous custom `contentEditable`/`document.execCommand` implementation. Toolbar support includes headings, bold, italic, lists, quote, link, media image insertion, YouTube embed, tables, alignment, undo, redo, and Code mode HTML review.
- Tiptap editor images can now be resized inside the content editor; resized images save a sanitized numeric `width` attribute while keeping `data-media-id` for media usage checks.
- The shared Tiptap Add Media/Add Image workflow now opens a `Select image` dialog with a 500px scrolling media list and Small/Medium/Large insert presets. Code mode now edits a local draft and applies sanitized HTML only on Apply/switch/blur instead of rewriting every keystroke.
- Code mode no longer syncs its draft HTML through the Tiptap visual schema while the Code tab is open, so allowed HTML wrappers such as `<div>` are not immediately converted to paragraphs while editing.
- Posts now follow the Pages-style admin UI with a WordPress-like list table, title-click editing, View/Delete actions, category selection, feature image selection, SEO/settings two-column layout, and the shared Tiptap visual editor.
- Blog posts now save new editor content to `cms_posts.body_html`; legacy `body_blocks` remain available for imported/older posts and public fallback rendering.
- Post editor images preserve `data-media-id`, and media usage checks include post `body_html` references.
- Post View/permalink and sitemap URLs now match the live WordPress-style structure `/{categorySlug}/{postSlug}` instead of `/blog/{postSlug}`. `/blog` remains available as an archive/list page path.
- Add Post validation now reports clear required-field messages for Title, Author, and Category instead of the generic media ID error. Category is required for new saves because it is part of the public post URL.
- WordPress import now creates or selects an `Uncategorized` fallback category for imported posts that have no WordPress category.
- WordPress import now retries the alternate `?rest_route=/wp/v2/...` endpoint and reports REST/API failures instead of marking an all-zero import as successful.
- Completed or failed import jobs no longer render a stale progress bar after the Website Workspace is refreshed; their detailed report remains available below.
- Setup Website Workspace now supports permanent deletion of inactive websites after confirmation. The flow deletes website-scoped database records and `websites/{website_id}/` Supabase Storage objects while preserving the global quiz.

## Validation Completed

Recent checks have passed after the quiz/navigation/permission changes:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
git diff --check -- features app docs test supabase
```

## Supabase Migrations To Remember

For post focus keyphrases, run the setup/provisioning migration:

- `setup-provisioning/supabase/migrations/202607100001_post_focus_keyphrase.sql`

For quiz fixes, the important migrations are:

- `202607050007_global_quiz.sql`
- `202607050008_simplify_global_quiz.sql`
- `202607050009_fix_quiz_function_permissions.sql`

If `202607050007_global_quiz.sql` was already run before the permission fix, run:

```text
supabase/migrations/202607050009_fix_quiz_function_permissions.sql
```

## 2026-07-16 — Homepage typography and table-of-contents parity

- The public Supabase homepage now renders CMS-authored Home HTML with an explicit, responsive H1–H4 scale, compact body text, left alignment, orange accessible links, list markers, responsive images, and readable table styling.
- Restored the collapsible Table of Contents immediately after the manual introduction. Its links use stable heading anchors generated at render time and scroll to the matching CMS section.
- The homepage order is now: manual introduction, Table of Contents, manual `Today Telenor Answer...` heading, global daily quiz, six Latest News cards, then the remaining manual content.
- The old imported `Latest News` heading and its Explore link are suppressed only in the public rendering because the six-card Latest News component now provides that section. The editor content is not modified.
- Validated in the local frontend with `npm.cmd test` (49 passing), `npm.cmd run lint`, `npm.cmd run build`, and `git diff --check`.

## 2026-07-16 — Legacy runtime removal guard

- Added a frontend test that rejects legacy WordPress package, client, endpoint, and environment references in `app/`, `components/`, `lib/`, `scripts/`, `package.json`, and `next.config.js`.
- Removed the final non-test legacy-name reference from the frontend source, so the standard runtime audit command returns no matches.
- Confirmed the public frontend remains Supabase-only at runtime with 50 passing frontend tests.

## 2026-07-16 â€” Local loopback domain support

- `CMS_SITE_DOMAIN` now applies to `localhost`, `127.0.0.1`, IPv6 loopback, and Vercel preview hosts in both public CMS reads and redirect middleware.
- Local testing through either `http://localhost:3000` or `http://127.0.0.1:3000` now resolves the selected Supabase website instead of attempting to read a non-existent loopback website record.
- Verified locally with manual Home content, Table of Contents, five Quiz CMS cards, and one Latest News section rendered through the loopback address.

## 2026-07-16 â€” Public route smoke test

- Verified the Supabase-backed local blog archive, category archive, post detail, search, author archive, and About page with real imported content.
- Confirmed invalid blog pagination returns HTTP 404.
- Confirmed a post opened under the wrong category returns HTTP 308 and redirects to its canonical category URL.

## 2026-07-16 â€” ads.txt enablement guard

- The public `ads.txt` route now requires the CMS AdSense enabled switch as well as non-empty ads.txt text.
- When AdSense is disabled, `ads.txt` returns 404 and cannot expose stale or accidentally retained publisher data.
- Local validation confirmed `robots.txt` and sitemap XML routes return 200, while disabled `ads.txt` returns 404.

## 2026-07-16 â€” Local revalidation authorization check

- Confirmed an invalid local POST to `/api/revalidate` returns HTTP 401.
- Configured a non-empty `CMS_REVALIDATION_SECRET` in the frontend local `.env.local` file. The secret value is intentionally not recorded in documentation.
- The Admin CMS sends its revalidation request using the selected website's encrypted **Settings → Revalidation webhook** secret, not an Admin CMS environment variable.
- Saved `http://127.0.0.1:3000/api/revalidate` and the matching encrypted secret for `test.telenorquiztoday.com.pk`. The resulting CMS settings update triggered the webhook successfully with HTTP 200.

## 2026-07-16 â€” Final local validation status

- Frontend tests passed (52), Admin CMS tests passed (95), and lint passed in both projects.
- The frontend production build passed.
- The Admin CMS production build passed in the normal local environment (75 seconds; compilation completed in 14.5 seconds). Earlier timeouts were caused by the restricted validation sandbox, not by CMS application code.

## 2026-07-18 - Custom Page legal layout and canonical-path preview

- Replaced the generic custom-Page post-style renderer with the shared Privacy-style legal-page renderer. Custom Pages no longer display post metadata, featured images, table of contents, ads, share controls, or a sidebar.
- Kept category archives and post detail routes unchanged, and changed custom-Page metadata from Article to website metadata.
- Reused the legal-page renderer for Editorial Policy and Corrections Policy so all legal content has the same layout and last-updated treatment.
- Added a live, read-only **Automatic canonical path** preview to the Page/Template editor. It derives from Title and Slug, stays separate from the optional override input, and is never saved automatically.

## 2026-07-18 - Custom Page UI simplification

- Removed the last-updated date from custom CMS Pages while retaining it for the fixed legal pages.
- Removed the generated-canonical help and automatic-path preview from the CMS editor. The optional canonical override input remains available and blank overrides still generate public canonical tags.

## 2026-07-17 - Contact, legal-page, and default SEO controls

- Removed the non-delivering Contact form and the **Related pages** panel from the public frontend.
- Unified Privacy Policy, Terms of Service, and Disclaimer under the CMS-backed legal-page layout; `/privacy` now permanently redirects to `/privacy-policy`.
- Added default `index,follow` editor values and clear **Canonical URL override (optional)** help text for Posts, custom Pages, and fixed Templates.
- Added `202607170002_default_index_follow_robots.sql`; it updates only null/blank robots values across all CMS websites and never writes canonical URLs.
- Hardened that migration for historic invalid Page paths: it skips reserved legacy routes such as `/blog`, which must be removed or renamed because the public frontend owns the archive route.
- Added frontend and Admin CMS regression tests for the contact removal, legal layout, redirect, automatic canonical fallback, and SEO editor/migration defaults.
