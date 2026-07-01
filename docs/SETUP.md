# CMS Setup

This document covers setup requirements for Supabase, Cloudflare R2, Vercel, and local development.

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
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Public websites:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Notes:

- Public websites should not have the service-role key.
- Admin browser code should not use service role.
- If an admin-side browser Supabase client is ever needed, use anon key only for safe operations; keep writes through route handlers.
- Admin CMS `.env` stores shared system configuration and secrets only.
- Adding a website must not require editing the admin CMS `.env`.

## Cloudflare R2 Setup

Use one R2 bucket for CMS media.

Recommended bucket name:

```text
cms-media
```

R2 object key format:

```text
websites/{website_id}/media/{yyyy}/{mm}/{uuid}.webp
websites/{website_id}/media/{yyyy}/{mm}/{uuid}-thumb.webp
```

Production URLs:

- Use a custom media domain, such as `media.example.com` or `cdn.example.com`.
- Do not use `r2.dev` URLs in production.

Admin CMS R2 environment variables:

```text
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=cms-media
R2_PUBLIC_BASE_URL=https://media.example.com
```

Rules:

- R2 write credentials are server-only.
- Public websites consume URLs returned by CMS data.
- Public websites do not list R2.
- Upload public WebP images with `Cache-Control: public, max-age=31536000, immutable`.
- Treat R2 image objects as immutable public assets.
- If image content changes, upload a new UUID object key and update CMS references instead of overwriting an existing public URL.
- Keep the custom media domain public/cacheable and do not add bot, IP verification, or challenge rules to it.

## Vercel Setup

Admin CMS:

- Deploy as its own Vercel project/domain.
- Configure `ADMIN_SECRET`.
- Configure Supabase service-role environment variables.
- Configure R2 write environment variables.

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
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=
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
- `cms_site_settings` for SEO defaults, robots.txt, sitemap settings, and encrypted revalidation settings.
- Other website-scoped tables for template content, posts, authors, categories, media, redirects, and import jobs.

Media for every website uses the same R2 bucket and is separated by object key prefix:

```text
websites/{website_id}/media/...
```

The admin CMS `.env` keeps shared system values such as Supabase keys, R2 credentials, `ADMIN_SECRET`, `CMS_ENCRYPTION_KEY`, and the shared media domain. Public websites may still need their own deployment environment variables once, but adding a new website to the CMS should not require changing the admin CMS deployment environment.

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
5. Create R2 bucket and custom media domain.
6. Configure admin CMS environment variables.
7. Configure public website environment variables.
8. Add public revalidation endpoints.
9. Add websites through the admin CMS/database records.
10. Run tests and manual checks.

## Security Checklist

- No service-role key in public websites.
- No service-role key in browser bundles.
- No R2 write credentials in browser bundles.
- Automatic table exposure disabled.
- RLS enabled on all CMS tables.
- Public RPCs/views tested with anon role.
- Revalidation webhook secrets are not public.
- `CMS_ENCRYPTION_KEY` is server-only.
- Import reset is available only for inactive websites.
