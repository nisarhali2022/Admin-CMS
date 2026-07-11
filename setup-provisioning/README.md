# CMS Setup Provisioning Project

This folder is the setup/provisioning project for the shared Supabase CMS database.

It owns:

- Supabase migrations in `setup-provisioning/supabase/migrations`.
- Website creation, editing, deactivation, and permanent deletion of inactive websites UI/API.
- Required default website setup rows:
  - `cms_websites`
  - `cms_website_domains`
  - `cms_site_settings`
- WordPress import, import progress, reset, and retry flows.

Permanent website deletion requires confirmation, removes all website-scoped database rows and Storage objects under `websites/{website_id}/`, and never deletes the global quiz.

The main Admin CMS is now a schema consumer. It reads existing websites for the header dropdown and manages website-scoped content after a website has already been provisioned here.

## Shared Database

Both apps use the same Supabase project/database.

Server-side setup routes need the same server-only values as the main CMS:

```env
ADMIN_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CMS_ENCRYPTION_KEY=
```

Public websites still use only public-safe Supabase anon credentials.

The main Admin CMS may also configure `SUPABASE_STORAGE_QUOTA_BYTES` so its Dashboard can estimate remaining shared `cms-media` bucket storage. That value is not required for setup/provisioning migrations or WordPress import.

## Workflow

1. Run/apply migrations from this setup project.
2. Create or update a website in this setup project.
3. Import WordPress content here if needed.
4. Open the main Admin CMS and manage content for the provisioned website.

## Shared Code

This app imports shared server/runtime logic from the local `cms-core` workspace package. The package is bundled into this app at build time; it is not deployed separately.

When extracting this setup app to another repository, either keep the monorepo structure with `packages/cms-core` or publish/copy an equivalent shared package.
