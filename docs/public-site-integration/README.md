# Public Website Integration

Milestone 11 prepares the public-site integration without editing a separate public website repository yet.

The admin CMS remains a separate app. Public websites must use Supabase anon credentials and public RPCs only. They must never call `/api/cms/...`, use the Supabase service-role key, upload/delete/list storage objects, or read admin-only tables.

## Public Website Env

Add these to each public website deployment:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
CMS_REVALIDATION_SECRET=
```

`CMS_REVALIDATION_SECRET` must match the website-level revalidation secret saved in the admin CMS settings for that website.

## Public Data Client

The reference helper lives in the shared `cms-core` package.

```js
import { createPublicCmsClient } from 'cms-core/public-cms'

const cms = createPublicCmsClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
})

const settings = await cms.getSiteSettings('example.com')
const posts = await cms.listPosts('example.com')
const post = await cms.getPost('example.com', 'hello-world')
const template = await cms.getTemplateContent('example.com', 'home')
const redirects = await cms.listRedirects('example.com')
```

All public reads resolve the active website by domain in Supabase. Inactive websites, import jobs, and revalidation secrets are not returned.

## Images

Public RPCs return resolved image objects:

```json
{
  "url": "https://project.supabase.co/storage/v1/object/public/cms-media/...",
  "alt": "Image alt",
  "caption": null,
  "width": 1200,
  "height": 800
}
```

The public website renders these URLs directly in `<img>` or framework image components. The browser downloads from Supabase Storage public URLs/CDN. Public websites do not list, upload, delete, or mutate storage objects.

## AdSense

Use the safe AdSense settings returned from `get_public_site_settings`.

```js
import { getAdsenseScriptSrc, shouldRenderAdsense } from 'cms-core/public-cms'

if (shouldRenderAdsense(settings)) {
  const src = getAdsenseScriptSrc(settings)
}
```

Render the AdSense script only when `enabled` is true and `publisherId` starts with `ca-pub-`.

## `/ads.txt`

Example App Router route for the public website:

```js
import { createPublicCmsClient, getAdsTxtContent } from 'cms-core/public-cms'

export async function GET(request) {
  const domain = request.headers.get('host')
  const cms = createPublicCmsClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
  const settings = await cms.getSiteSettings(domain)
  const adsTxt = getAdsTxtContent(settings)

  if (!adsTxt) return new Response('Not found', { status: 404 })

  return new Response(adsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
```

## Revalidation Endpoint

Each public website should expose a server-only endpoint that the admin CMS can call after public-facing changes.

```js
import {
  normalizeRevalidationPayload,
  verifyRevalidationSecret,
} from 'cms-core/public-cms'
import { revalidatePath } from 'next/cache'

export async function POST(request) {
  if (!verifyRevalidationSecret(request, process.env.CMS_REVALIDATION_SECRET)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = normalizeRevalidationPayload(await request.json())
  const paths = payload.paths.length > 0 ? payload.paths : ['/', '/blog', '/sitemap.xml']

  for (const path of paths) {
    revalidatePath(path)
  }

  return Response.json({ revalidated: true, paths, event: payload.event })
}
```

Webhook failure must be visible in the admin CMS response but must not roll back the saved content.

## Redirects

Public websites should call `listRedirects(domain)` or the equivalent helper early in request handling/middleware. Only active redirects are returned.

V1 public websites must not update `hit_count` or `last_hit_at` with anon credentials.

## Global Quiz

Quiz is global and is not resolved by website domain.

```js
const quiz = await cms.getCurrentQuiz()
```

The helper calls `cms_public_get_current_quiz()` with Supabase anon credentials. It returns only the latest published quiz from `cms_global_quiz`.

## Not Implemented In This Repo

The actual visitor-facing pages are not in this admin CMS repo. When the first public website repo is available, wire these helpers into its:

- template/page routes
- blog list and blog detail routes
- metadata generation
- image rendering
- redirect handling
- `/ads.txt`
- `/robots.txt`
- `/sitemap.xml`
- global quiz rendering
- revalidation endpoint
