# CMS Rebuild Change Log

This file records the major product, architecture, schema, UI, and documentation changes made during the CMS rebuild planning and implementation. It is intended as a readable handoff summary, not a runtime audit log.

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
- Active CMS behavior is publish-only and permanent-delete only; draft, trash, restore, move-to-trash, and unpublish workflows are removed from the active product.

## Documentation Alignment: Latest Post And Import Contracts

- Normalized docs around Tiptap `body_html` as the preferred post body and `body_blocks` as legacy/import fallback.
- Documented category-based post URLs consistently across planning, API, testing, and public-site integration docs.
- Clarified that `/blog` remains only the archive/list path.
- Clarified required Author and Category validation for new post saves.
- Clarified WordPress fallback records: `Imported Author` and `Uncategorized`.
- Marked older duplicate-page guidance as superseded by the `cms_pages` custom-page model.

Note: older entries below record the path taken during implementation. Any older mention of bulk trash/restore, media trash filters, draft/unpublish, optional post category, `/blog/{postSlug}` detail URLs, body-block-first editing, or Pages without View actions is superseded by the current direction above and the later correction entries.

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
- `/admin` is a simple empty Dashboard landing page.
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
  - `websites/{website_id}/media/{yyyy}/{mm}/{uuid}.webp`
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
- Media Library status filtering now defaults to `Live media`, supports `All media items` and `Trash`, and no longer shows the unused date dropdown.
- Media with empty alt text now falls back to the uploaded filename, and new uploads/imports save that filename fallback.
- Media downloads now use a blob-based browser download handler instead of relying on cross-origin link download behavior.
- Media search now filters automatically while typing, and the Media table supports checkbox selection plus bulk permanent delete through the existing safe delete endpoint. The visible `Usage` action remains available for manual reference checks.
- Categories, Authors, and Redirects no longer render duplicate table footer headers, and their table body text now uses normal black styling.
- Template Content is now presented as a WordPress-style Pages screen: a table of fixed pages first, then an Edit Page view after clicking a title.
- Template pages now support `focus_keyphrase` and optional same-website `author_id`; the editor shows Focus keyphrase, SEO title, Meta description, and Author below the content box.
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
- The Pages content area now uses a WordPress-like visual editor with working toolbar actions, Code mode for sanitized HTML, and an Add Media picker that inserts selected images.
- The Pages editor now places the SEO card and page settings/feature-image card in one responsive two-column row.
- The Pages visual editor now uses Tiptap open-source editor packages instead of the previous custom `contentEditable`/`document.execCommand` implementation. Toolbar support includes headings, bold, italic, lists, quote, link, media image insertion, YouTube embed, tables, alignment, undo, redo, and Code mode HTML review.
- Posts now follow the Pages-style admin UI with a WordPress-like list table, title-click editing, View/Delete actions, category selection, feature image selection, SEO/settings two-column layout, and the shared Tiptap visual editor.
- Blog posts now save new editor content to `cms_posts.body_html`; legacy `body_blocks` remain available for imported/older posts and public fallback rendering.
- Post editor images preserve `data-media-id`, and media usage checks include post `body_html` references.
- Post View/permalink and sitemap URLs now match the live WordPress-style structure `/{categorySlug}/{postSlug}` instead of `/blog/{postSlug}`. `/blog` remains available as an archive/list page path.
- Add Post validation now reports clear required-field messages for Title, Author, and Category instead of the generic media ID error. Category is required for new saves because it is part of the public post URL.
- WordPress import now creates or selects an `Uncategorized` fallback category for imported posts that have no WordPress category.

## Validation Completed

Recent checks have passed after the quiz/navigation/permission changes:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
git diff --check -- features app docs test supabase
```

## Supabase Migrations To Remember

For quiz fixes, the important migrations are:

- `202607050007_global_quiz.sql`
- `202607050008_simplify_global_quiz.sql`
- `202607050009_fix_quiz_function_permissions.sql`

If `202607050007_global_quiz.sql` was already run before the permission fix, run:

```text
supabase/migrations/202607050009_fix_quiz_function_permissions.sql
```
