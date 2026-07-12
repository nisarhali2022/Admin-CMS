# CMS Implementation Milestones

Use this file as the execution tracker. Complete and test each milestone before moving to the next one. For implementation patterns, read `IMPLEMENTATION_CONTEXT.md` first.

Before starting any milestone after Milestone 1, read `MILESTONE_REVIEWS.md` and especially the latest completed milestone review entry.

Every milestone includes:

- Purpose: why the milestone exists.
- Dependencies: docs and previous work required first.
- Build: what needs to be implemented.
- Files/modules: expected project areas to create or edit.
- Inputs/outputs: important payloads, rows, URLs, objects, or UI state.
- Interactions: how this milestone connects to other modules.
- Constraints: what to avoid.
- Exit tests: proof that the milestone is complete.

Completion gate for every milestone:

- Run the milestone's exit tests and required project checks.
- Update `MILESTONE_REVIEWS.md` with what changed, validation results, caveats, follow-ups, and next-milestone readiness.
- Do not report the milestone as complete until the review entry is added.

## Milestone 1: Foundation And Admin Session

Purpose:

- Establish a safe admin-only foundation and project structure before adding CMS data.

Dependencies:

- Read `PROJECT_PLAN.md`, `DECISIONS.md`, `ARCHITECTURE.md`, `SETUP.md`, and `IMPLEMENTATION_CONTEXT.md`.
- Start from the existing `ADMIN_SECRET` helper and `/api/admin/session` route.

Build:

- Verify the existing admin login/session flow.
- Add server-side environment validation for required admin CMS variables.
- Add basic brute-force protection for `/api/admin/session`, such as short-window rate limiting or temporary lockout.
- Establish the feature-separated folder structure from `IMPLEMENTATION_CONTEXT.md`.
- Replace the temporary landing page with a basic admin shell route, without building resource screens yet.

Files/modules:

- `lib/adminAuth.js`
- `app/api/admin/session/route.js`
- `lib/env/` or equivalent environment validation helper
- `app/(admin)/admin/`
- `features/admin-shell/`
- `lib/auth/`

Inputs/outputs:

- Input: admin secret submitted to `/api/admin/session`.
- Output: signed admin session cookie and authenticated session status.
- Output: clear startup/runtime error when required admin env vars are missing.

Interactions:

- All future admin route handlers depend on this session check.
- Website selection and CMS resource routes must build on this admin shell.

Constraints:

- Do not add Supabase schema, website CRUD, media, import, or public website integration.
- Do not introduce multi-user auth in v1.
- Logout clears the current browser cookie only; server-side session revocation is deferred unless a session store is added later.

Exit tests:

- Admin login succeeds with valid `ADMIN_SECRET`.
- Invalid admin secret is rejected.
- Missing required env vars fail predictably.
- Basic brute-force protection is covered by unit or route tests.
- App boots locally.
- `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build` pass.

## Milestone 2: Setup Project Supabase Schema And Migration Order

Purpose:

- Create the database foundation with correct website scoping, relationships, constraints, and delete semantics in the setup/provisioning project.

Dependencies:

- Complete Milestone 1.
- Read `MILESTONE_REVIEWS.md`, especially the latest completed milestone review entry.
- Read `DATA_MODEL.md`, `SETUP.md`, `RLS_POLICIES.md`, and `IMPLEMENTATION_CONTEXT.md`.

Build:

- Create migrations for all v1 CMS tables in `setup-provisioning/`.
- Add indexes, unique constraints, publish-only content rules, permanent-delete behavior, and timestamps.
- Ensure every normal CMS resource has `website_id`.
- Handle `cms_authors.avatar_image_id` safely by creating `cms_media` before adding the FK, or adding the FK after both tables exist.
- Create the public Supabase Storage bucket `cms-media` in the Supabase project setup, not as a per-website bucket.

Files/modules:

- `setup-provisioning/supabase/migrations/`
- optional `supabase/seed.sql`
- `docs/DATA_MODEL.md` if implementation discovers a contract mismatch

Inputs/outputs:

- Input: empty Supabase database.
- Output: v1 CMS tables, constraints, indexes, and bucket setup.
- Output: `cms_import_jobs` exists for WordPress import tracking.

Interactions:

- RLS policies and public RPCs in Milestone 3 depend on this schema.
- Admin CRUD milestones depend on database constraints matching app validators.

Constraints:

- Do not build admin UI.
- Do not shape public RPC responses yet.
- Do not implement WordPress import logic yet.
- Do not add removed v1 tables: `cms_tags`, `cms_post_tags`, or `cms_audit_events`.
- `cms_template_content` is for fixed templates only; `cms_pages` is for custom Pages rows.

Exit tests:

- Migrations apply cleanly to an empty database.
- Duplicate website domains are rejected.
- Per-website slugs can repeat across websites but not within one website.
- `cms_posts.author_id` is required.
- `cms_import_jobs` exists and is website-scoped.
- `cms_media.storage_path` is unique.

## Milestone 3: Setup Project RLS And Public RPCs

Purpose:

- Make public reads safe before admin CRUD starts creating real website content. SQL ownership remains in `setup-provisioning/`.

Dependencies:

- Complete Milestone 2.
- Read `MILESTONE_REVIEWS.md`, especially the latest completed milestone review entry.
- Read `RLS_POLICIES.md`, `API_CONTRACTS.md`, `DATA_MODEL.md`, and `IMPLEMENTATION_CONTEXT.md`.

Build:

- Enable RLS on all CMS tables.
- Add grants so anon can execute only safe public RPCs/views.
- Implement website domain resolution.
- Implement public-safe read rules per resource type.
- Implement public template/post/category/author/settings/redirect read functions or views.
- Resolve `mediaId` references to public image objects for public template/post responses.

Files/modules:

- `setup-provisioning/supabase/migrations/`
- `lib/cms/public-read-model.js`
- `lib/cms/serializers/`
- optional SQL test fixtures

Inputs/outputs:

- Input: public website domain.
- Output: active website context or no content.
- Output: public-safe rows for active website content only.
- Output: resolved image objects with `url`, `alt`, `caption`, `width`, and `height`.

Interactions:

- Public websites use these RPCs/views instead of admin APIs.
- Media, authors, categories, redirects, and settings must remain filtered by resolved `website_id`.

Constraints:

- Do not build admin CRUD screens.
- Do not change public website frontend code yet.
- Do not allow redirect hit tracking writes from anon clients.
- Do not expose import jobs, secrets, inactive website data, or service-only fields.

Exit tests:

- Anon can read template/post content for the resolved active website only.
- Anon can read active authors, categories, active redirects, safe settings, and referenced media only.
- Anon cannot read import jobs, inactive website data, or revalidation secrets.
- Public image objects include `url`, `alt`, `caption`, `width`, and `height` when available.

## Milestone 4: Website Provisioning And Main CMS Selection

Purpose:

- Let the single admin create website records in the setup/provisioning project and select existing websites in the main CMS.

Dependencies:

- Complete Milestones 1-3.
- Read `MILESTONE_REVIEWS.md`, especially the latest completed milestone review entry.
- Read `PROJECT_PLAN.md`, `API_CONTRACTS.md`, `USER_FLOWS.md`, `SETUP.md`, and `IMPLEMENTATION_CONTEXT.md`.

Build:

- Build website list, create, edit, and deactivate flows in `setup-provisioning/`.
- Keep the main CMS website list read-only for header selection.
- Store website data in `cms_websites`, `cms_website_domains`, and `cms_site_settings`.
- Create default settings rows for new websites.
- Allow website active/inactive status to be changed after setup/import is ready.
- Keep selected website explicit through `websiteId` in admin URLs.
- Ensure adding websites requires database/admin records only, not admin CMS `.env` changes.

Files/modules:

- `setup-provisioning/app/(admin)/admin/add-website/`
- `setup-provisioning/app/api/cms/websites/`
- `setup-provisioning/features/websites/`
- `app/api/cms/websites/` for read-only website listing/detail in the main CMS
- `lib/cms/repositories/websites*`
- `lib/cms/validators/websites*`

Inputs/outputs:

- Input: website name and primary domain.
- Output: inactive website row, primary domain row, default settings row.
- Output: selected `websiteId` in admin route state/URL.

Interactions:

- Later main CMS admin screens must require selected `websiteId`.
- Public RPC domain resolution depends on website/domain rows.

Constraints:

- Permanent website delete is implemented only for inactive websites; it must remove the website's Storage prefix before transactional database cleanup.
- Do not implement domain alias UI beyond one primary domain field.
- Do not create website-specific Supabase Storage buckets.
- Do not expose website create/edit/deactivate mutations from the main CMS.
- Do not let global quiz depend on selected website context.

Exit tests:

- Setup project website creation requires name and primary domain.
- Duplicate domains are rejected.
- New websites start inactive.
- Main CMS website selection reloads website-scoped screens by `websiteId`.
- Deactivation hides public data but keeps associated resources.
- Activation makes the website resolvable by public RPCs once its domain is configured.
- Adding a website requires no admin CMS `.env` change.

## Milestone 5: Media Library And Supabase Storage

Purpose:

- Provide safe website-scoped media upload, metadata, selection, and deletion before content editors need images.

Dependencies:

- Complete Milestones 1-4.
- Read `MILESTONE_REVIEWS.md`, especially the latest completed milestone review entry.
- Read `ARCHITECTURE.md`, `DATA_MODEL.md`, `API_CONTRACTS.md`, `SETUP.md`, and `IMPLEMENTATION_CONTEXT.md`.

Build:

- Build media upload through server route handlers.
- Add Supabase Storage helpers under `lib/storage/`.
- Convert/compress uploads to WebP with the server-side `sharp` dependency.
- Store objects under `websites/{website_id}/media/{yyyy}/{mm}/{filename}.webp`.
- Upload public WebP images with Supabase Storage `cacheControl: '31536000'`.
- Save metadata, public URL, alt text, caption, dimensions, MIME type, file size, source, and storage path in `cms_media`.
- Build media picker filtered by selected website.
- Implement usage lookup and permanent delete checks.
- Build the Media Library table with automatic search, row/header checkboxes, `Usage` row action, and bulk permanent delete that reuses the existing per-item delete endpoint.

Files/modules:

- `app/api/cms/media/`
- `features/media/`
- `lib/storage/`
- `lib/cms/repositories/media*`
- `lib/cms/services/media*`
- `lib/cms/validators/media*`
- `lib/cms/serializers/media*`

Inputs/outputs:

- Input: multipart image upload, `websiteId`, alt text, caption.
- Output: Supabase Storage object path.
- Output: `cms_media` row and admin media response.
- Output: public image object through public RPC serializers.

Interactions:

- Template content, posts, authors, and SEO OG image fields reference media rows by `mediaId`.
- Permanent delete must query all media usage locations before deleting storage objects.
- Revalidation is required when public-used media metadata or references change.

Constraints:

- No shared/global media library.
- No direct browser writes to Supabase Storage.
- Public websites must not upload, delete, or list Supabase Storage objects.
- Do not overwrite existing public image URLs; image replacement creates a new readable filename path with a numeric collision suffix.

Exit tests:

- Uploaded files become WebP.
- Supabase Storage paths include the correct `website_id`.
- Public WebP uploads include Supabase Storage `cacheControl: '31536000'`.
- Replacing an image creates a new storage path instead of overwriting the old public URL.
- Media picker shows only selected website media.
- Cross-website media assignment is rejected.
- Referenced media cannot be permanently deleted.
- Unused permanent delete removes the Supabase Storage object first and then hard deletes metadata.
- Storage delete failure keeps the media metadata row and surfaces an error.
- Media search filters automatically while typing.
- Bulk delete selected media calls the existing safe delete route per row and reports success/failure counts.
- Usage lookup remains visible in the Media row Actions column.

## Milestone 6: Categories And Authors

Purpose:

- Build blog taxonomy and author profiles before posts require them.

Dependencies:

- Complete Milestones 1-5.
- Read `MILESTONE_REVIEWS.md`, especially the latest completed milestone review entry.
- Read `DATA_MODEL.md`, `API_CONTRACTS.md`, `USER_FLOWS.md`, `TESTING.md`, and `IMPLEMENTATION_CONTEXT.md`.

Build:

- Build category CRUD for selected website.
- Build author CRUD for selected website.
- Support author avatar selection from same-website media.
- Block inactive authors from new post selection.
- Block permanent author delete while posts reference the author unless reassignment is implemented.

Files/modules:

- `app/api/cms/categories/`
- `app/api/cms/authors/`
- `features/categories/`
- `features/authors/`
- `lib/cms/repositories/categories*`
- `lib/cms/repositories/authors*`
- `lib/cms/validators/categories*`
- `lib/cms/validators/authors*`

Inputs/outputs:

- Input: category name/slug/description.
- Input: author name/slug/bio/avatar image/active state.
- Output: website-scoped category and author rows.
- Output: author picker options for post editor.

Interactions:

- Posts require one same-website author and one same-website category.
- Public post responses include author and category display data.
- Author changes affecting public posts trigger revalidation.

Constraints:

- Do not add tags.
- Do not add author login accounts.
- Do not support multiple authors per post in v1.

Exit tests:

- Categories and authors are filtered by selected `website_id`.
- Duplicate category/author slugs are rejected within one website.
- Same slugs can exist across different websites.
- Cross-website author avatar assignment is rejected.
- Inactive authors do not appear in the post author picker.
- Referenced author permanent delete is blocked unless reassignment is implemented.

## Milestone 7: Template Content

Purpose:

- Let admin edit fixed page-template fields without creating a generic page builder.

Dependencies:

- Complete Milestones 1-6.
- Read `MILESTONE_REVIEWS.md`, especially the latest completed milestone review entry.
- Read `DATA_MODEL.md`, `API_CONTRACTS.md`, `USER_FLOWS.md`, `ARCHITECTURE.md`, and `IMPLEMENTATION_CONTEXT.md`.

Build:

- Build fixed template content editing for supported template keys.
- Validate `content_data` against code-defined template schemas.
- Support SEO fields, feature image/OG-compatible image reference, sitemap include flag, internal admin preview, publish-only save, and permanent delete.
- Store image references by `mediaId`.
- Trigger revalidation after public-facing changes.

Files/modules:

- `app/api/cms/template-content/`
- `features/template-content/`
- `lib/cms/schemas/template-content*`
- `lib/cms/repositories/template-content*`
- `lib/cms/services/template-content*`
- `lib/cms/validators/template-content*`
- `lib/cms/serializers/template-content*`

Inputs/outputs:

- Input: template key, path, title, content data, SEO fields, and feature image/OG-compatible image reference.
- Output: website-scoped template content row.
- Output: public template response with resolved image objects.

Interactions:

- Media picker supplies same-website images.
- Public websites render fixed layouts using returned template content.
- Sitemap and SEO use template content and sitemap include flag.

Constraints:

- Do not add custom page creation to fixed template content; custom pages live in `cms_pages` and use the separate Pages API.
- Do not build page builder or layout builder.
- Do not build public draft preview tokens.
- Do not support future scheduling.

Exit tests:

- Template content is unique by `(website_id, template_key)`.
- Public reads return only template content for active websites.
- Public template responses return resolved image objects.
- Revalidation runs after save, permanent delete, SEO changes, and media changes used by public content.

## Milestone 8: Blog Posts

Purpose:

- Build structured blog publishing with fixed layout, website-scoped authors/categories, media, and SEO.

Dependencies:

- Complete Milestones 1-7.
- Read `MILESTONE_REVIEWS.md`, especially the latest completed milestone review entry.
- Read `DATA_MODEL.md`, `API_CONTRACTS.md`, `USER_FLOWS.md`, `TESTING.md`, and `IMPLEMENTATION_CONTEXT.md`.

Build:

- Build post CRUD for selected website.
- Require one same-website author and one same-website category.
- Support featured image, SEO fields, OG-compatible image reference, sitemap include flag, publish-only save, and permanent delete.
- Build the Pages-style post list/editor UI with Tiptap visual editing and Code HTML mode.
- Store new edited post content in `body_html`; keep `body_blocks` as legacy/import fallback.
- Store editor image references with `data-media-id` and legacy body block images by `mediaId`.
- Trigger revalidation after public-facing post, author, SEO, and media changes.

Files/modules:

- `app/api/cms/posts/`
- `features/posts/`
- `components/admin/RichTextEditor.jsx`
- `lib/cms/schemas/post-blocks*`
- `lib/cms/repositories/posts*`
- `lib/cms/services/posts*`
- `lib/cms/validators/posts*`
- `lib/cms/serializers/posts*`

Inputs/outputs:

- Input: title, slug, excerpt, author, category, featured image, Tiptap `bodyHtml`, optional legacy `bodyBlocks`, and SEO fields.
- Output: website-scoped post row.
- Output: public post/list response with author data, `bodyHtml`, legacy `bodyBlocks`, and resolved image objects.
- Output: FAQ data suitable for FAQ schema.

Interactions:

- Authors, categories, media, redirects, sitemap, SEO, and revalidation all connect to posts.
- Public websites render the fixed blog shell and should prefer `bodyHtml`, falling back to `bodyBlocks`.

Constraints:

- Do not add tags.
- Do not support missing or multiple categories per post.
- Do not support multiple authors per post.
- Do not add an arbitrary page builder layout model; blog layout stays fixed while the body editor stores sanitized HTML.
- Do not support future scheduling.

Exit tests:

- Posts cannot save without `author_id`.
- Author, category, featured image, OG image, editor HTML images, and legacy body image blocks must belong to the selected website.
- Public post/list responses include author display data and resolved image objects.
- FAQ blocks produce data suitable for FAQ schema.
- Author changes affecting public posts trigger revalidation.

## Milestone 9: Redirects, Settings, Robots, Sitemap, And AdSense

Purpose:

- Add site-level controls that affect routing, SEO, public metadata, and cache refresh behavior.

Dependencies:

- Complete Milestones 1-8.
- Read `MILESTONE_REVIEWS.md`, especially the latest completed milestone review entry.
- Read `DATA_MODEL.md`, `API_CONTRACTS.md`, `RLS_POLICIES.md`, `USER_FLOWS.md`, and `IMPLEMENTATION_CONTEXT.md`.

Build:

- Build redirect manager with 301/302 support.
- Build site settings, robots.txt, sitemap settings, SEO defaults, AdSense settings, and revalidation webhook settings.
- Encrypt revalidation secrets with `CMS_ENCRYPTION_KEY`.
- Expose only safe settings through public RPCs/views.
- Trigger revalidation after public-facing settings, redirect, robots, sitemap, AdSense, or SEO changes.

Files/modules:

- `app/api/cms/redirects/`
- `app/api/cms/settings/`
- `features/redirects/`
- `features/settings/`
- `lib/cms/repositories/redirects*`
- `lib/cms/repositories/settings*`
- `lib/cms/services/revalidation*`
- `lib/cms/validators/redirects*`
- `lib/cms/validators/settings*`

Inputs/outputs:

- Input: redirect source path, destination, and type.
- Input: robots.txt, sitemap settings, SEO defaults, AdSense settings, revalidation URL/secret.
- Output: active redirect rows and safe public settings.
- Output: encrypted revalidation secret stored admin-only.

Interactions:

- Public websites consume active redirects and safe settings.
- Public websites consume safe AdSense settings to decide whether to render the AdSense script and `/ads.txt`.
- Revalidation webhooks refresh public caches after affected changes.
- Sitemap depends on published templates/posts and include flags.

Constraints:

- Do not allow public writes.
- Do not allow anon redirect hit tracking updates.
- Do not build manual schema builder.
- Do not expose revalidation secrets publicly.

Exit tests:

- Duplicate redirect source paths are rejected per website.
- Redirect loops are rejected.
- Public reads return only active redirects.
- Revalidation secrets never return to public clients.
- Sitemap excludes inactive websites and rows with sitemap inclusion disabled.
- New websites default to inactive AdSense settings.
- Enabling AdSense without a valid `ca-pub-...` publisher ID is rejected.
- Disabling AdSense preserves saved values but public settings return inactive behavior.
- AdSense changes trigger revalidation.

## Milestone 10: Setup Project WordPress Import

Purpose:

- Provide one-time inactive-site migration from WordPress into the new website-scoped CMS model from the setup/provisioning project.

Dependencies:

- Complete Milestones 1-9.
- Read `MILESTONE_REVIEWS.md`, especially the latest completed milestone review entry.
- Read `ARCHITECTURE.md`, `DATA_MODEL.md`, `API_CONTRACTS.md`, `USER_FLOWS.md`, and `IMPLEMENTATION_CONTEXT.md`.

Build:

- Build inactive-website-only import in `setup-provisioning/`.
- Track progress and reports in `cms_import_jobs`.
- Support public WordPress REST import without credentials.
- Support optional WordPress username and application password for protected or incomplete REST data.
- Encrypt temporary credentials with `CMS_ENCRYPTION_KEY` only if a background import must persist them.
- Delete temporary WordPress credentials after import success, failure, or reset.
- Import known pages into template content.
- Import posts, categories, authors, featured images, inline images, and SEO metadata where available.
- Create or reuse website-scoped authors in `cms_authors`.
- Use fallback author `Imported Author` when WordPress author data is unavailable.
- Use fallback category `Uncategorized` when WordPress post category data is unavailable.
- Rewrite old WordPress image URLs to Supabase Storage public URLs.
- Implement import reset for inactive websites only.

Files/modules:

- `setup-provisioning/app/api/cms/import/`
- `setup-provisioning/features/import/`
- `lib/cms/services/import*`
- `lib/cms/services/wordpress*`
- `lib/cms/repositories/import-jobs*`
- `lib/storage/`
- `lib/cms/serializers/import*`

Inputs/outputs:

- Input: WordPress base URL, optional username, optional application password, inactive website confirmation.
- Output: import job row and progress report.
- Output: template content, posts, categories, authors, media rows, and copied storage objects.
- Output: rewritten image URLs and failed-media report.

Interactions:

- Uses media, authors, categories, template content, posts, settings, and storage helpers.
- Reuses validation and ownership rules from normal CRUD modules.
- Reset must only affect selected inactive website data.
- Main CMS must not expose WordPress import routes or UI.

Constraints:

- Do not allow active website import.
- Do not import into another website's resources.
- Do not put unmatched WordPress pages into fixed template slots.
- Import unmatched WordPress pages into `cms_pages` as custom pages.
- Do not store WordPress credentials in `.env`, reports, public responses, or logs.

Exit tests:

- Active website import is blocked.
- Public WordPress REST import works without credentials when source data is available.
- Optional WordPress application-password import works for protected REST data.
- Temporary encrypted WordPress credentials are cleared after import success, failure, or reset.
- Import job records progress, counts, skipped items, unmatched pages, failed media, and errors.
- Unmatched WordPress pages import into `cms_pages` or are explicitly reported as skipped with a reason.
- Imported posts never save without `author_id`.
- Fallback author is created or reused when needed.
- Fallback category `Uncategorized` is created or reused when needed.
- Imported images are copied to Supabase Storage under the selected website prefix.
- Reset clears only the inactive selected website's scoped rows and imported Supabase Storage objects.

## Milestone 11: Public Website Integration

Purpose:

- Connect separately deployed public websites to safe CMS reads, image URLs, redirects, settings, and revalidation.

Dependencies:

- Complete Milestones 1-10.
- Read `MILESTONE_REVIEWS.md`, especially the latest completed milestone review entry.
- Read `ARCHITECTURE.md`, `RLS_POLICIES.md`, `API_CONTRACTS.md`, `SETUP.md`, and `IMPLEMENTATION_CONTEXT.md`.

Build:

- Public websites resolve their `website_id` by domain through public RPCs/views.
- Public websites fetch public-safe CMS data only.
- Public websites render returned image URLs and author data without service-role credentials.
- Public websites render the AdSense script only when safe settings say AdSense is active and configured.
- Public websites expose `/ads.txt` only when AdSense is active and `adsTxt` content exists.
- Public websites expose server-only revalidation endpoints.
- Public websites cache reads where appropriate and refresh after revalidation.

Files/modules:

- public website data-fetching modules
- public website revalidation route
- CMS revalidation service
- public RPC/view SQL from Supabase migrations
- if no public website repo is available yet, add reusable integration helpers and documentation in the admin CMS repo, then wire them into the public website later

Inputs/outputs:

- Input: public request domain and page/post slug or template key.
- Output: public-safe CMS content and resolved image objects.
- Output: safe AdSense state used for script rendering and `/ads.txt`.
- Input: admin CMS revalidation webhook request.
- Output: refreshed public paths or surfaced webhook error.

Interactions:

- Public websites consume RPCs/views from Milestone 3.
- Public websites render content created in Milestones 4-10.
- Admin CMS revalidation calls public website endpoints after public-facing changes.

Constraints:

- Do not give public websites service-role key.
- Do not let public websites access admin APIs.
- Do not let public websites upload, delete, or list Supabase Storage objects.

Exit tests:

- Public website renders template content and posts for its own domain only.
- Browser downloads images from Supabase Storage public URLs/CDN.
- Public website does not render AdSense when inactive.
- Public website renders AdSense script when active and configured.
- Public website returns `/ads.txt` only when active and configured.
- Public website has anon key only, not service-role key.
- Revalidation webhook requires the configured secret.
- Webhook failure is visible to admin but does not roll back saved content.
- If implementation is helper/docs-only because the public website repo is unavailable, tests verify helper behavior and docs state the remaining public-site wiring.

## Milestone 12: Quiz Isolation

Purpose:

- Rebuild or port global quiz behavior without contaminating website-scoped CMS architecture.

Dependencies:

- Complete relevant foundation work from Milestone 1.
- Read `MILESTONE_REVIEWS.md`, especially the latest completed milestone review entry.
- Read `PROJECT_PLAN.md`, `DECISIONS.md`, `USER_FLOWS.md`, and `IMPLEMENTATION_CONTEXT.md`.
- Use the separate live quiz copy as reference if needed.

Build:

- Port or rebuild the global quiz behavior without making it website-scoped.
- Keep quiz outside selected website context.
- Store current quiz questions in Supabase using global quiz storage with no `website_id`.
- Do not store quiz title, slug, description, visible date, SEO date, or page metadata.
- Keep quiz logic separate from website-scoped CMS modules.

Files/modules:

- `app/(admin)/admin/quiz/`
- `features/quiz/`
- quiz-specific helper modules only

Inputs/outputs:

- Input: global quiz update payload.
- Output: one global quiz update applied for all public websites.
- Output: current quiz questions, update timestamp, `global: true`, and `websiteScoped: false`.

Interactions:

- Quiz can live in the admin shell but must not require `websiteId`.
- Website selection must not filter quiz behavior.
- Supabase quiz storage must remain global.

Constraints:

- Do not add website-scoped quiz behavior.
- Do not implement generic CMS scheduling for template content or posts.
- Do not add `website_id` to quiz.

Exit tests:

- Quiz does not require selected `websiteId`.
- Quiz saves to Supabase-backed global storage.
- One quiz update applies globally.
- Quiz storage contains only current quiz questions, publish state, and update timestamp.
- Quiz table does not store title, slug, description, visible date, SEO date, or page metadata.
- Homepage/page SEO remains in website template/settings data.
- Website-scoped CMS changes do not affect quiz behavior.

## Milestone 13: Final Hardening

Purpose:

- Verify the complete system, security boundaries, documentation accuracy, and implementation readiness before v1 release.

Dependencies:

- Complete Milestones 1-12.
- Read `MILESTONE_REVIEWS.md`, especially all unresolved caveats and follow-up items.
- Read `TESTING.md`, `RLS_POLICIES.md`, `SETUP.md`, `INDEX.md`, and `IMPLEMENTATION_CONTEXT.md`.

Build:

- Run full automated checks.
- Run manual admin and public website regression flows.
- Verify security boundaries for Supabase service-role access, Supabase Storage mutations, revalidation, and website scoping.
- Verify Dashboard selected-website metrics and shared `cms-media` Supabase Storage usage.
- Update docs if implementation changes any contract.
- Remove temporary scaffold code only after real admin shell/pages replace it.
- Replace the temporary all-in-one milestone workspace with separate admin pages or navigable sections for websites, media, template content, posts, categories, authors, redirects, settings, and quiz.

Files/modules:

- all app, feature, lib, Supabase, and docs files
- test suite and manual test notes

Inputs/outputs:

- Input: complete v1 implementation.
- Output: passing automated checks and manual regression checklist.
- Output: docs matching implementation contracts.

Interactions:

- Confirms all milestones work together: admin auth, website scoping, media, import, public reads, revalidation, and quiz isolation.

Constraints:

- Do not add new product scope.
- Do not implement deferred v1 exclusions.
- Do not leave implementation changes undocumented.

Exit tests:

- `npm.cmd test` passes.
- `npm.cmd run lint` passes.
- `npm.cmd run build` passes.
- Public anon checks pass for all public RPCs/views.
- Cross-website content, author, media, redirect, and settings access is blocked.
- Setup project provisioning/import, media, revalidation, public rendering, and quiz regression flows pass.
- Admin UI no longer depends on one long page for all website-scoped resources.
- Dashboard storage usage route requires admin auth and shows safe aggregate storage numbers only.
- Missing or invalid `SUPABASE_STORAGE_QUOTA_BYTES` shows the quota-not-configured state.
