# CMS Implementation Context

Use this file as the implementation pattern reference. `IMPLEMENTATION_MILESTONES.md` defines build order; this file defines how each piece should be shaped.

## Module Layout

Canonical folders:

```text
app/
  (admin)/admin/
  api/
    admin/
    cms/
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
      services/
      validators/
      serializers/
      schemas/
supabase/
  # migrations are owned by setup-provisioning/
setup-provisioning/
  app/
  features/
  supabase/
    migrations/
```

Rules:

- `features/*` owns UI, screen state, and feature-specific components.
- `app/api/*` route handlers own HTTP concerns only: session check, payload parsing, status codes, and response shape.
- `packages/cms-core/cms/repositories/*` owns database reads/writes.
- `packages/cms-core/cms/services/*` owns multi-step workflows such as publish, import, permanent delete, revalidation, and storage cleanup.
- `packages/cms-core/cms/validators/*` owns request validation, ownership checks, slug checks, schema checks, and cross-website reference checks.
- `packages/cms-core/cms/serializers/*` owns admin/public response shaping.
- `packages/cms-core/storage/*` owns Supabase Storage upload/delete/public URL helpers.
- Apps import shared code from `cms-core/...`; the shared package is bundled into each app and is not deployed separately.
- Shared helpers must stay narrow. Do not create broad catch-all utility files.

## Naming

- Use `websiteId` in API payloads and route query params.
- Use `website_id` in database columns and SQL.
- Use `mediaId`, `authorId`, `categoryId`, and `templateKey` in JS payloads.
- Use `storage_path` in database rows for Supabase Storage object paths.
- Use `public_url` in database rows for resolved public image URLs.
- Use `body_blocks` in database rows and `bodyBlocks` in API payloads.
- Public API responses return resolved image objects instead of raw media IDs unless a raw ID is explicitly needed by trusted internal rendering.

## Admin Route Pattern

Every website-scoped admin route must:

1. Validate the `ADMIN_SECRET` session.
2. Parse and validate JSON or multipart payload.
3. Require `websiteId`.
4. Verify referenced rows belong to the selected website.
5. Call a service or repository, not direct database code from UI components.
6. Trigger revalidation when public rendering changes.
7. Return the shared structured error shape from `API_CONTRACTS.md`.

The `/api/admin/session` route is the only v1 login route. It should include basic brute-force protection before real deployment, such as short-window rate limiting or temporary lockout. The current signed-expiry cookie is acceptable for v1, but logout only clears the current browser cookie. Server-side session revocation is not included unless a session store is added later.

## Environment Validation

Milestone 1 must add server-side environment validation before building CMS features.

Admin CMS requires:

- `ADMIN_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CMS_ENCRYPTION_KEY`

Public websites require their own deployment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `CMS_REVALIDATION_SECRET`

The admin browser must never receive the Supabase service-role key. The admin CMS does not require `NEXT_PUBLIC_SUPABASE_ANON_KEY` unless a future admin-browser Supabase client is deliberately introduced for safe read-only behavior.

## Supabase Storage Helper Contract

Use one public Supabase Storage bucket:

```text
cms-media
```

Object path pattern:

```text
websites/{website_id}/media/{yyyy}/{mm}/{uuid}.webp
```

Upload helper input:

- `websiteId`
- original file bytes
- original filename
- detected source, either `upload` or `wordpress_import`
- optional alt text and caption

Upload helper behavior:

- validate accepted image MIME type and size before optimization
- convert/compress to WebP with the server-side `sharp` dependency
- create a new UUID storage path
- upload with `cacheControl: '31536000'`
- never overwrite an existing public storage path
- return `storagePath`, `publicUrl`, `width`, `height`, `mimeType`, and optimized `fileSize`

Delete helper input:

- `storagePath`

Delete helper behavior:

- delete only from the configured `cms-media` bucket
- reject paths that do not start with `websites/`
- return a structured success/error result
- never allow public websites or browser code to upload, delete, or list Supabase Storage objects

Admin media permanent delete must check references first. If unused, delete the Supabase Storage object first, then hard-delete the `cms_media` row. If object deletion fails, keep the media row and surface the error.

## Revalidation Pattern

Services that change public rendering should return affected paths or events to a shared revalidation helper.

Trigger revalidation after:

- template save, permanent delete, SEO change, or media reference change
- post save, permanent delete, SEO change, author change, category change, or media reference change
- redirect changes
- settings, robots, sitemap, AdSense, or SEO default changes
- media metadata changes used by public content
- author changes affecting public posts

Webhook failure must be visible to the admin but must not roll back the saved content.

## Public Read Pattern

Public websites use anon credentials and public RPCs/views only.

Public read flow:

1. Resolve active website by domain.
2. Fetch only public-safe rows for that `website_id`.
3. Resolve `mediaId` references through `cms_media`.
4. Return image objects with `url`, `alt`, `caption`, `width`, and `height`.
5. Return safe website settings, including AdSense only as `enabled`, `publisherId`, `autoAdsEnabled`, and `adsTxt`.
6. Return no import jobs, service-only fields, or revalidation secrets.

AdSense public reads must defensively return `enabled: false` when AdSense is inactive or the publisher ID is missing/invalid. Public website code must render the AdSense script only from the safe settings response and must not rely on `.env` for website-level AdSense state.

## Import Pattern

WordPress import is an inactive-website-only setup workflow.

Import services must:

- create/update `cms_import_jobs`
- import authors before posts where possible
- use fallback author `Imported Author` when needed
- never save imported posts without `author_id`
- copy imported images to Supabase Storage
- rewrite old WordPress image URLs to Supabase Storage public URLs
- clear temporary encrypted credentials after success, failure, or reset
- reset only the selected inactive website's scoped rows and imported storage objects
