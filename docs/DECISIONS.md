# CMS Decisions

This file records decisions that should not be re-decided during implementation unless the project owner explicitly changes scope.

## Product Decisions

- Build a separate admin CMS deployed on its own Vercel domain.
- Keep public websites as separate deployed sites with their own UI, layout, frontend theme, and rendering.
- CMS owns website data only: template content, blog posts, blog authors, categories, media metadata, redirects, SEO fields, robots, sitemap settings, AdSense settings, and website settings.
- Use one admin user in v1.
- Keep the existing `ADMIN_SECRET` login/session model in v1.
- After login, admin selects the website being managed.
- Use `website_id` as the foreign key for normal website-specific resources.
- Quiz remains global and is not scoped by website.

## Content Decisions

- Use `cms_template_content` only for fixed page templates: `home`, `about`, `contact`, `privacy`, `terms`, and `packages`.
- Use `cms_pages` for WordPress-style custom pages created from the Pages admin screen.
- Public websites own fixed page layout and visual sections.
- CMS stores editable template fields, links, image references, and SEO metadata.
- Do not build a page builder or layout builder in v1.
- Do not store required `content_html` in v1.
- If rendered HTML is added later, it must be explicitly chosen and sanitized.
- Blog post pages use fixed public website layout.
- Blog article bodies use structured `body_blocks`.
- Supported post body blocks are paragraph, heading, image, list, quote, link/button, TOC placeholder, FAQ, table, and callout.
- Each post has one category in v1.
- Each post has one website-scoped author in v1.
- Authors are profile/content records, not login users.
- Future scheduling for template content and posts is not included in v1.
- Tags and post tags are not included in v1.
- Revision history and rollback are not included in v1.

## Website Decisions

- Website creation requires name and primary domain.
- New websites start inactive.
- V1 UI shows one primary domain field.
- Keep `cms_website_domains` so aliases can be supported later.
- Public websites resolve their `website_id` by domain.
- Website removal means deactivate, not permanent delete.
- Deactivation hides public content but keeps associated resources.
- Adding a website is managed through admin/database records, not by editing the admin CMS `.env`.
- Website data is stored in `cms_websites`, `cms_website_domains`, `cms_site_settings`, and related website-scoped tables.
- AdSense Active/Inactive state, publisher ID, auto-ads preference, and optional `ads.txt` content are stored per website in site settings, not `.env`.

## Media Decisions

- Use Supabase Storage as the v1 CMS media backend.
- Use one Supabase Storage bucket for all CMS media.
- Separate website media by immutable `website_id` prefix.
- Supabase Storage path pattern is `websites/{website_id}/media/{yyyy}/{mm}/{uuid}.webp`.
- Use original filenames only as metadata.
- No shared or global media library in v1.
- Media picker only shows selected website media.
- Cross-website media selection is blocked.
- Media delete is permanent after confirmation.
- Permanent media delete checks references before deleting the object.
- Unused media delete removes the Supabase Storage object, then hard deletes the metadata row.
- If Supabase Storage deletion fails, the media row stays in place and the admin sees an error.

## Access And Security Decisions

- Enable Supabase Data API.
- Disable automatic exposure of new tables.
- Enable automatic RLS for new tables.
- Public websites use Supabase anon key with RLS.
- Public websites read through public read-only RPCs/views, not admin APIs.
- Admin app uses Supabase service role only inside server route handlers after admin session validation.
- No public writes are allowed.
- Revalidation webhook secrets are stored encrypted with a server-only CMS encryption key.
- Multi-user roles are deferred.
- Audit events/activity log is not included in v1.

## Import Decisions

- WordPress import is a one-time setup flow per website.
- Import is allowed only while the website is inactive.
- WordPress import can use public REST data without credentials when available.
- Optional WordPress username and application password can be entered during import for protected or incomplete REST data.
- OAuth client ID/client secret is not required for v1 WordPress import.
- WordPress import credentials are not stored in `.env` and are not stored permanently.
- If temporary credential storage is needed for a background job, encrypt it with `CMS_ENCRYPTION_KEY` and delete it after success or failure.
- Import published posts, known supported pages, categories, authors, and media/images.
- Known pages map to fixed template keys.
- Unmatched WordPress pages go to an import review list.
- WordPress post content converts to supported body blocks where possible.
- Import creates or reuses website-scoped authors in `cms_authors`.
- Use fallback author `Imported Author` when WordPress author data is unavailable.
- Imported posts must never save without `author_id`.
- Imported and embedded images are copied to Supabase Storage.
- Old WordPress image URLs are rewritten to Supabase Storage public URLs.
- Failed import reset is allowed only for inactive websites and clears only that website's scoped data and Supabase Storage objects.
- Import progress and reports are tracked in `cms_import_jobs`.

## Public Website Decisions

- Public websites fetch only public-safe CMS data for their resolved `website_id`.
- Public reads hide inactive websites and service-only data.
- Public websites can cache CMS reads.
- Public websites expose a server-only revalidation webhook so public-facing content, SEO, redirect, settings, AdSense, media, and author changes can refresh cached pages.
- Revalidation webhook secrets are per website and admin-only.

## Quiz Decisions

- Quiz remains global and separate from selected website context.
- Quiz storage contains only the current quiz questions, publish state, and update timestamp.
- Quiz table has no `website_id`, title, slug, description, visible date, SEO date, or page metadata.
- Homepage/page SEO belongs to website template/settings data, not the quiz table.
