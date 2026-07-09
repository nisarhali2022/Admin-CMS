# Implementation Guide

This guide defines the recommended build order. Follow it to avoid losing context or mixing responsibilities. Use `IMPLEMENTATION_MILESTONES.md` as the testable execution tracker for the same work.

## Build Order

1. Review `PROJECT_PLAN.md`, `DECISIONS.md`, and `ARCHITECTURE.md`.
2. Review `IMPLEMENTATION_CONTEXT.md` and `IMPLEMENTATION_MILESTONES.md`.
3. Create Supabase migrations from `DATA_MODEL.md` in `setup-provisioning/`.
4. Implement RLS, public RPCs/views, and grants from `RLS_POLICIES.md`.
5. Add Supabase server/client helpers.
6. Add Supabase Storage helpers.
7. Add CMS schemas and validators.
8. Add repositories.
9. Add admin route handlers.
10. Build admin shell and read-only website selection in the main CMS.
11. Build website management in `setup-provisioning/`.
12. Build media library.
13. Build categories.
14. Build authors.
15. Build template content management.
16. Build posts with the shared Tiptap editor and `body_html` save path.
17. Build redirects.
18. Build settings, SEO, robots, sitemap, and AdSense controls.
19. Build WordPress import in `setup-provisioning/`.
20. Add public revalidation calls.
21. Keep global quiz isolated.
22. Run tests and manual verification from `TESTING.md`.

## Engineering Rules

- UI components do not call Supabase directly.
- UI components do not call Supabase Storage directly.
- Route handlers validate admin session.
- Route handlers call services/repositories.
- Repositories own database access.
- Validators own payload, slug, ownership, content schema, editor HTML validation, and legacy body block validation.
- Supabase Storage helpers live under `packages/cms-core/storage/`.
- CMS schemas live under `packages/cms-core/cms/schemas/`.
- Multi-step workflows live under `packages/cms-core/cms/services/`.
- Apps import shared logic from `cms-core/...`; `cms-core` is bundled into each app and is not deployed separately.
- Public read logic is separate from admin write logic.
- Import logic is separate from normal CRUD logic and lives in `setup-provisioning/`.
- Quiz logic is separate from website-scoped CMS logic.
- Avoid catch-all utility files.
- Keep large screens composed from smaller feature widgets.

## Suggested Code Structure

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
lib/
  auth/
  supabase/
  storage/
  cms/
    repositories/
    services/
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
```

## Implementation Notes

Supabase:

- Add server-side environment validation before CMS features call Supabase.
- Use service role only in server route handlers.
- Keep anon/public client only for public websites and safe public reads.
- Never expose service role in browser code.
- Public websites should call RPCs/views, not raw admin APIs.

Admin session:

- Keep the existing signed `ADMIN_SECRET` cookie model for v1.
- Add basic brute-force protection to `/api/admin/session` before real deployment.
- Treat logout as current-browser cookie clearing only; server-side session revocation is not included unless a session store is added later.

Website scoping:

- Every website-scoped route requires `websiteId`.
- Every repository method for website-scoped resources takes `websiteId`.
- Every edit/delete verifies the row belongs to `websiteId`.
- Cross-website media/category/author references are rejected.
- Adding a website is a setup/provisioning database action, not an admin CMS `.env` change.
- Website records live in `cms_websites`, `cms_website_domains`, `cms_site_settings`, and related website-scoped tables.
- Main CMS website APIs are read-only and only support selection of existing websites.

Authors:

- Authors are website-scoped profile records, not login users.
- One admin user creates, edits, and permanently deletes authors.
- Author avatars must use media from the same website.
- Posts select one active author from the same website.
- Permanent author delete is blocked while posts reference the author, unless posts are reassigned first.

Media:

- Convert uploads to WebP before saving.
- Generate Supabase Storage paths with website ID prefix.
- Save Supabase Storage metadata in `cms_media`.
- Keep original filename as metadata only.
- Store image references in template/post JSON by `mediaId`.
- Use `cms-media` as the single public Supabase Storage bucket.
- Upload through server-only helpers with `cacheControl: '31536000'`.
- Public websites never upload, delete, or list Supabase Storage objects.
- Permanent delete checks usage before deleting the Supabase Storage object.
- If Supabase Storage deletion fails during permanent delete, keep the metadata row and show an error.

Scheduling:

- Template content and posts do not support future scheduling in v1.
- Template content, custom pages, and posts are publish-only in v1.
- Quiz is global current data and must not be implemented as generic CMS scheduling.

Revalidation:

- Trigger after save, permanent delete, redirect changes, SEO changes, settings changes, AdSense changes, author changes that affect public posts, and media changes used by public content.
- Webhook failure should be visible to admin but should not roll back the saved content.

AdSense:

- Store AdSense settings per website in `cms_site_settings`.
- Default new websites to inactive AdSense.
- Admin UI exposes Active/Inactive, publisher ID, auto-ads, and optional `ads.txt`.
- Enabling AdSense requires a valid `ca-pub-...` publisher ID.
- Public settings return only safe AdSense fields.
- Public websites render the AdSense script only when AdSense is active and configured.
- Public websites serve `/ads.txt` only when AdSense is active and `ads.txt` content exists.
- Do not add AdSense values to `.env`; they are website-level database settings.

Import:

- Import belongs to `setup-provisioning/`, not the main CMS.
- Only inactive websites can import.
- Track import progress and reports in `cms_import_jobs`.
- Use public WordPress REST data without credentials when available.
- Accept optional WordPress username/application password during import when needed.
- Never store WordPress import credentials in `.env` or permanent records.
- Encrypt temporary import credentials with `CMS_ENCRYPTION_KEY` only when a background job requires persistence, then clear them after success/failure/reset.
- Import reset is dangerous and inactive-only.
- Import must not modify other websites.
- Import reports should be explicit about skipped and unmatched items.

## Context Checklist Before Each Feature

Before implementing a feature, check:

- Does it require `websiteId`?
- Does it need to remain global like quiz?
- Does it touch public rendering and need revalidation?
- Does it reference media/category/author rows from the same website only?
- Does it need RLS/RPC updates?
- Does it need tests in `TESTING.md`?

## Deferred Work

Do not implement in v1 unless scope changes:

- multi-user roles
- tags
- audit events/activity log
- shared/global media library
- page builder/layout builder
- public draft preview tokens
- revision history/rollback
- SEO scoring
- manual schema builder
