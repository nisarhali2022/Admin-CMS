# CMS Setup

This document covers setup requirements for Supabase, Supabase Storage, Vercel, and local development.

## Supabase Setup

Required project settings:

- Enable Data API.
- Disable automatic exposure of new tables.
- Enable automatic RLS for new tables.

Reasoning:

- Data API is needed for `supabase-js`, RPCs/views, and server route handlers.
- Automatic table exposure should stay disabled so access is granted deliberately.
- Automatic RLS is a safety default for new public-schema tables.

Important:

- Existing tables still need RLS enabled manually.
- Public websites use anon key.
- Admin server route handlers use service-role key.
- Service-role key must never be exposed to browser code.

## Supabase Environment Variables

Admin CMS:

```text
ADMIN_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CMS_ENCRYPTION_KEY=
```

Public websites:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Notes:

- Public websites should not have the service-role key.
- Admin CMS does not need `NEXT_PUBLIC_SUPABASE_ANON_KEY` unless a future admin-browser Supabase client is deliberately added for safe read-only behavior.
- Admin browser code should not use service role.
- If an admin-side browser Supabase client is ever needed, use anon key only for safe operations; keep writes through route handlers.
- Admin CMS `.env` stores shared system configuration and secrets only.
- Adding a website must not require editing the admin CMS `.env`.
- Milestone 1 must add server-side environment validation for required admin CMS variables.

## Supabase Storage Setup

Use one Supabase Storage bucket for CMS media.

Recommended bucket name:

```text
cms-media
```

Storage path format:

```text
websites/{website_id}/media/{yyyy}/{mm}/{uuid}.webp
```

Bucket configuration:

- Create a public file bucket named `cms-media`.
- Install/use the server-side `sharp` dependency for WebP conversion in the admin upload pipeline.
- V1 stores one optimized public WebP object per media record; do not create thumbnail/object variants unless the data model is extended to track them.
- Use Supabase Storage generated public URLs in v1.
- Do not use signed URLs for public website images in v1.
- Do not add separate Supabase Storage environment variables in v1; use the existing Supabase URL and service-role key on the admin server.

Rules:

- Supabase service-role key is server-only.
- Admin route handlers upload/delete media with trusted server-side Supabase helpers.
- Public websites consume URLs returned by CMS data.
- Public websites do not upload, delete, or list Supabase Storage objects.
- Upload public WebP images with Supabase Storage `cacheControl: '31536000'`.
- Treat Supabase Storage image objects as immutable public assets.
- If image content changes, upload a new UUID storage path and update CMS references instead of overwriting an existing public URL.

## Vercel Setup

Admin CMS:

- Deploy as its own Vercel project/domain.
- Configure `ADMIN_SECRET`.
- Configure Supabase service-role environment variables.
- Create the `cms-media` Supabase Storage bucket before testing media uploads.

Public websites:

- Remain separate Vercel projects/sites.
- Configure Supabase anon environment variables.
- Configure public revalidation webhook endpoint and secret.
- Read public-safe data from Supabase RPCs/views.

Admin CMS environment variables:

```text
ADMIN_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CMS_ENCRYPTION_KEY=
```

Public website environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
CMS_REVALIDATION_SECRET=
```

## Adding Websites

Adding a website is an admin/database action, not an admin CMS `.env` change.

Website-specific data belongs in:

- `cms_websites` for name, slug, active state, and timestamps.
- `cms_website_domains` for primary domain and future aliases.
- `cms_site_settings` for SEO defaults, robots.txt, sitemap settings, AdSense settings, and encrypted revalidation settings.
- Other website-scoped tables for template content, posts, authors, categories, media, redirects, and import jobs.

Media for every website uses the same Supabase Storage bucket and is separated by storage path prefix:

```text
websites/{website_id}/media/...
```

The admin CMS `.env` keeps shared system values such as Supabase keys, `ADMIN_SECRET`, and `CMS_ENCRYPTION_KEY`. Public websites may still need their own deployment environment variables once, but adding a new website to the CMS should not require changing the admin CMS deployment environment.

AdSense is also website-level database configuration. Do not add AdSense publisher IDs or Active/Inactive state to `.env`; store them in `cms_site_settings.adsense_settings` so admins can change them without redeploying code.

## WordPress Import Credentials

WordPress import does not require credentials when the source site's public REST API exposes the needed posts, pages, authors, media, and SEO metadata.

If public REST data is blocked or incomplete, the import form can ask for:

- WordPress username
- WordPress application password

Do not ask for OAuth client ID/client secret in v1. Standard WordPress REST imports use application passwords when credentials are needed.

Rules:

- Do not store WordPress import credentials in `.env`.
- Do not store WordPress import credentials permanently in Supabase.
- If a background import must persist credentials temporarily, encrypt them with `CMS_ENCRYPTION_KEY`.
- Delete temporary credentials after import success, failure, or reset.
- Never show WordPress credentials in reports, logs, public responses, or error messages.

## Public Revalidation Setup

Each public website should expose a server-only revalidation endpoint.

Example endpoint:

```text
POST /api/cms/revalidate
```

Expected behavior:

- verify per-website secret
- revalidate provided paths
- return success/failure JSON

The admin CMS stores webhook URL and encrypted webhook secret per website. Encrypt the stored secret with server-only `CMS_ENCRYPTION_KEY`.

Do not expose `CMS_ENCRYPTION_KEY` to browser code or public websites.

## Local Development

Expected checks:

```powershell
npm test
npm run lint
npm run build
```

Local `.env` should include only development keys. Do not commit secrets.

## Setup Order

1. Configure Supabase project settings.
2. Create migrations from `DATA_MODEL.md`.
3. Enable/verify RLS and grants from `RLS_POLICIES.md`.
4. Create public RPCs/views.
5. Create the public Supabase Storage bucket `cms-media`.
6. Configure admin CMS environment variables.
7. Configure public website environment variables.
8. Add public revalidation endpoints.
9. Add websites through the admin CMS/database records.
10. Run tests and manual checks.

## Security Checklist

- No service-role key in public websites.
- No service-role key in browser bundles.
- Automatic table exposure disabled.
- RLS enabled on all CMS tables.
- Public RPCs/views tested with anon role.
- Revalidation webhook secrets are not public.
- `CMS_ENCRYPTION_KEY` is server-only.
- Import reset is available only for inactive websites.
