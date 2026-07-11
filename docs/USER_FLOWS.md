# User Flows

## Login

1. Admin opens the admin CMS.
2. Admin enters `ADMIN_SECRET`.
3. App creates the existing admin session cookie.
4. Admin is redirected to `/admin/quiz` for the global quiz update.

Failure states:

- invalid secret
- expired session

## Website Selection

1. Admin sees all configured websites.
2. Admin selects a website.
3. Admin is taken to `/admin?websiteId=<id>`.
4. Website-scoped routes include `websiteId` in the URL.

Expected behavior:

- selected website is controlled by the header dropdown and `websiteId` URL query
- header titles show only the selected website name when a website is selected
- switching website reloads website-scoped screens
- normal CMS menu pages do not show website management cards
- quiz remains available without selected website context

## Dashboard

1. Admin selects a website from the header dropdown.
2. Admin opens `/admin`.
3. Dashboard loads selected-website counts for pages, posts, images, and selected-website image storage.
4. Dashboard also loads shared `cms-media` Supabase Storage usage across all websites.
5. Admin sees total media files, used storage, remaining configured storage, and a usage bar.

Expected behavior:

- Dashboard metrics are read-only.
- selected-website image storage is scoped to the selected website's `cms_media` rows
- shared CMS Storage usage is bucket-level across all managed websites
- remaining storage is an estimate from `SUPABASE_STORAGE_QUOTA_BYTES`
- if the quota env value is missing or invalid, Dashboard shows `Quota not configured`
- public websites never list Supabase Storage objects

## Website Management

Website management lives in `setup-provisioning/`, not in the main Admin CMS.

Create website:

1. Admin opens the setup/provisioning app.
2. Admin enters name and primary domain.
3. Setup app generates a unique slug.
4. Setup app creates inactive website and primary domain row.
5. Setup app creates default site settings.
6. Admin CMS `.env` does not change for the new website.
7. Main CMS can now select the website from the header dropdown.

Deactivate website:

1. Admin confirms deactivation.
2. Setup app sets `is_active = false`.
3. Public reads return no content for that website.
4. Associated resources remain stored.

Activate website:

1. Admin selects the website after setup/import is ready.
2. Admin changes website status to Active.
3. Setup app sets `is_active = true`.
4. Public reads can resolve that website by its configured domain.

Blocked states:

- duplicate domain
- invalid domain

Rules:

- website data is stored in `cms_websites`, `cms_website_domains`, `cms_site_settings`, and related website-scoped tables
- media for the website uses the shared Supabase Storage bucket under `websites/{website_id}/media/...`
- only inactive websites can be permanently deleted
- deleting a website removes all related rows and Storage objects under its website prefix after confirmation
- global quiz data is preserved

## WordPress Import

1. Admin opens the setup/provisioning app.
2. Admin selects an inactive website.
3. Admin enters WordPress base URL.
4. Admin optionally enters WordPress username and application password if public REST access is blocked or incomplete.
5. Setup app tests WordPress REST API access.
6. Setup app fetches WordPress REST API data.
7. Setup app imports known pages into template content.
8. Setup app imports posts into the preferred `body_html` format when practical, or keeps compatible `body_blocks` fallback data when needed.
9. Setup app imports categories and authors where available.
10. Setup app copies images to Supabase Storage.
11. Setup app rewrites inline image URLs.
12. Setup app tracks progress in `cms_import_jobs.report.progress`.
13. Admin sees the progress bar update while import is running.
14. Setup app deletes any temporary WordPress credentials after success or failure.
15. Setup app shows import report.

Blocked states:

- website is active
- WordPress API unavailable
- invalid base URL
- invalid optional WordPress username/application password

Failure behavior:

- failed reset is allowed only for inactive websites
- reset clears that website's imported rows and Supabase Storage objects
- website row and domain setup remain
- WordPress credentials are never shown in reports or errors

## Template Content Editing

1. Admin selects website.
2. Admin opens Pages / Template Content.
3. Admin edits fixed template pages such as home, about, contact, privacy, terms, and packages, or uses Add Page to create a custom `cms_pages` row.
4. Admin can search pages automatically while typing, review meta titles in the table, and bulk delete selected saved pages after confirmation.
5. Admin edits content, links, image references, SEO fields, author, slug, and feature image.
6. Admin saves published page content or permanently deletes it.

Expected behavior:

- no drag/drop layout editing
- Add Page creates a custom page row and does not replace fixed template content
- content schema validates before save
- image picker shows selected website media only
- future scheduling is not available for template content in v1
- save/delete triggers public revalidation

## Author Management

1. Admin selects website.
2. Admin opens Authors.
3. Admin creates, edits, or permanently deletes author profiles.
4. Admin can add name, slug, bio, active state, and avatar image.

Expected behavior:

- authors are not login users
- author avatar image must belong to selected website
- author slug is unique within selected website
- same author slug can exist on different websites
- inactive authors are not selectable for new posts
- permanent delete is blocked while posts reference the author, unless posts are reassigned first

## Blog Post Editing

1. Admin selects website.
2. Admin opens Posts.
3. Admin creates or edits a post.
4. Admin selects one author.
5. Admin selects one category.
6. Admin selects featured image if needed.
7. Admin edits article content in the Tiptap visual editor or Code HTML mode.
8. Admin edits SEO fields.
9. Admin saves the published post or permanently deletes it.

Supported editor content:

- headings
- paragraphs
- bold and italic text
- lists
- blockquotes
- links
- images selected from the website Media Library
- YouTube embeds
- tables
- alignment

Legacy body blocks can still be opened as starter HTML:

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

Expected behavior:

- post page layout remains fixed on public website
- TOC is generated from heading blocks
- FAQ block can generate FAQ schema
- author picker shows selected website authors only
- category is required because the visitor-facing post URL is `/{categorySlug}/{postSlug}`
- same slug can exist on different websites
- duplicate slug is blocked within same website
- future scheduling is not available for posts in v1

## Media Library

1. Admin selects website.
2. Admin opens Media.
3. Admin uploads image.
4. Server validates file.
5. Server converts/compresses image to WebP.
6. Server uploads to Supabase Storage under `websites/{website_id}/media/...`.
7. CMS saves metadata row.
8. Admin can edit alt text/caption.
9. Admin can search media automatically while typing.
10. Admin can select one or more media rows and bulk delete them.
11. Admin can use the `Usage` action to check references manually.
12. Admin can select image from template/post editors.

Delete behavior:

- delete is permanent after confirmation
- bulk delete is permanent after one confirmation and processes selected media through the same safe delete endpoint
- delete checks usage first
- referenced media cannot be deleted
- unused media deletes Supabase Storage object before hard deleting metadata row
- if Supabase Storage deletion fails, the metadata row stays in place and admin sees an error

## Categories

1. Admin selects website.
2. Admin creates, edits, or permanently deletes categories.
3. Posts can select one category.

Blocked states:

- duplicate slug within website
- deleting category used by posts without reassignment or explicit handling

## Redirects

1. Admin selects website.
2. Admin creates redirect with source path, destination, and type.
3. CMS validates 301 or 302.
4. CMS blocks duplicate source path within website.
5. CMS blocks redirect loops.
6. Public site applies active redirects.

V1 public websites do not update redirect hit tracking with anon credentials.

## SEO And Settings

Admin can edit:

- SEO title and meta description per template/post
- canonical override
- robots meta
- OG image
- sitemap include flag
- robots.txt per website
- sitemap settings
- SEO defaults
- AdSense Active/Inactive status per website
- AdSense publisher ID
- AdSense auto-ads preference
- Optional AdSense `ads.txt` content

System handles:

- default canonical generation
- sitemap generation from published content
- Article schema for posts
- WebPage schema for template content
- FAQ schema from FAQ blocks
- public AdSense script rendering only when AdSense is active and configured
- `/ads.txt` response only when AdSense is active and `ads.txt` content exists

AdSense flow:

1. Admin selects a website.
2. Admin opens website settings.
3. Admin sets AdSense to Active or Inactive.
4. If Active, CMS requires a valid `ca-pub-...` publisher ID.
5. Admin can optionally edit auto-ads and `ads.txt`.
6. CMS saves the settings for that website and triggers public revalidation.
7. Public website reads safe settings and renders AdSense only when active.

## Delete Behavior

1. Admin confirms delete for a resource.
2. CMS checks usage rules where required.
3. If allowed, CMS permanently deletes the resource.

Website deactivation is separate from resource deletion.

## Global Quiz

1. Admin opens `/admin/quiz`.
2. Website selection is not required.
3. Admin updates quiz.
4. One quiz update applies globally.

Expected behavior:

- quiz code stays isolated from CMS website-scoped logic
- website selection never filters quiz targets
- quiz is linked from the top header, not the website-scoped left sidebar
- `/admin/quiz` does not show the left sidebar
- quiz storage contains only current quiz questions, publish state, and update timestamp
- homepage/page SEO is managed through website template/settings data

## Public Website Read Flow

1. Public website loads page.
2. It calls Supabase public RPC/view with its domain.
3. Supabase resolves active website.
4. Supabase returns public-safe data for that website.
5. Public website renders with its own layout/theme.
6. Public website uses media URLs returned from CMS records.

Hidden from public:

- inactive websites
- another website's resources
