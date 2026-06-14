# Telenor Quiz Project Overview

## 1. Purpose

This repository contains a content-focused website for daily Telenor quiz
answers, telecom/news articles, and supporting informational pages.

The application has two main content sources:

- WordPress REST API: posts, pages, categories, tags, media, authors, and quiz
  content.
- Static application content: navigation, site settings, ads, quiz guidance,
  FAQs, and participation steps.

There is also a browser-based admin page that updates the WordPress post with
the fixed slug `daily-quiz`.

## 2. Technology

| Area | Technology |
| --- | --- |
| Framework | Next.js 15 App Router |
| UI | React 19 |
| Styling | Tailwind CSS 3 and Typography plugin |
| CMS | WordPress REST API v2 |
| Rendering | Static generation, ISR, and dynamic server rendering |
| Images | `next/image` with WordPress remote images |
| Ads | Google AdSense integration |
| Language | JavaScript and JSX |

The project has no database of its own. WordPress is the production data store.
`data/quiz.json` is legacy/local data and is not read by the current
application.

## 3. Main User Features

- Daily quiz answers on the homepage.
- Latest WordPress news posts.
- Category archive pages.
- Tag archive pages.
- Blog archive with pagination.
- Individual WordPress post pages.
- WordPress content pages.
- Search with pagination.
- Related posts, featured images, metadata, table of contents, breadcrumbs,
  share buttons, and sidebars.
- SEO metadata, JSON-LD, sitemap, and robots output.
- Admin editor for five daily quiz questions.
- On-demand cache revalidation API.
- Midnight Karachi homepage revalidation through Vercel Cron.

## 4. Application Architecture

The project follows the Next.js App Router model:

1. A request enters a route under `app/`.
2. Server components call helpers in `lib/wordpress.js`.
3. WordPress data is fetched and cached using Next.js `fetch` revalidation.
4. Data is transformed by helpers in `lib/utils.js`, `lib/quizParser.js`, and
   `lib/toc.js`.
5. Route components compose reusable components from `components/`.
6. Client components add interaction for navigation, search, admin editing,
   sharing, ads, and table-of-contents expansion.

Most public content is cached for 3,600 seconds. Search is forced dynamic.
Quiz and news requests use cache tags so the quiz API can invalidate quiz
content.

`vercel.json` calls `/api/cron/midnight` daily at `19:00 UTC`, which is
midnight in Karachi. The endpoint invalidates the cached homepage, and the next
request regenerates it with the new date.

## 5. Core Content Flows

### Homepage

`app/page.jsx` requests two WordPress post lists in parallel:

- A one-post request intended to provide the daily quiz.
- Six posts intended to provide the latest news.

It parses quiz tables and FAQs from WordPress HTML, then renders quiz cards,
news, static information, participation steps, ads, FAQs, and the sidebar.

Important: the current quiz request does not filter by the `daily-quiz` slug.
It therefore relies on that post being the latest WordPress post. This is a
confirmed design defect documented in `BUG_FIXING.md`.

### Category or Page

`app/[slug]/page.jsx` gives a single URL segment two meanings:

1. Look for a WordPress category with the slug.
2. If no category exists, look for a WordPress page with the slug.
3. If neither exists, return the Next.js not-found page.

Category content displays a paginated post archive. Page content displays the
WordPress body with a generated table of contents and an inserted ad.

### Post

`app/[slug]/[post_slug]/page.jsx` loads a post by `post_slug`. The first segment
is treated as its category in URLs and breadcrumbs, but the route currently
does not verify that it matches the post's real category.

### Quiz Administration

`app/admin/quiz/page.jsx` provides a five-question editor. Saving sends:

```text
POST /api/admin/session
secret: <admin secret>

then, with the HTTP-only session cookie:

POST /api/quiz
```

The session API validates the secret and creates a signed eight-hour cookie.
`app/api/quiz/route.js` validates that session and the quiz payload, converts
the quiz to HTML tables, then creates or updates the WordPress `daily-quiz`
post using Basic Authentication. The date is assigned automatically by the
server in the `Asia/Karachi` timezone; there is no manual date field. Quiz
fields are length-checked, answer-checked, and HTML-escaped before storage.

## 6. Configuration

Public site settings are in `lib/constants.js`, including:

- Production URL.
- WordPress API URL.
- Logo and favicon URLs.
- ISR duration.
- posts-per-page value.
- navigation links.
- AdSense client and slot IDs.
- category color classes.

Server environment variables used by the application:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_WORDPRESS_API_URL` | WordPress API used by the quiz write route |
| `WP_ADMIN_USER` | WordPress API username |
| `WP_ADMIN_PASS` | WordPress application password |
| `ADMIN_SECRET` | Validates admin login and signs admin sessions |
| `REVALIDATE_SECRET` | Protects cache revalidation requests |
| `CRON_SECRET` | Protects Vercel's midnight revalidation request |

Do not commit `.env.local`; it is already ignored.
Configure a random `CRON_SECRET` in the Vercel project environment.

## 7. Rendering and Caching

| Route type | Behavior |
| --- | --- |
| Homepage and fixed content pages | ISR, normally one hour |
| Category/page `[slug]` routes | Prebuilt for known categories, ISR enabled |
| Post routes | Server rendered on demand with cached WordPress fetches |
| Blog | Dynamic when query parameters are used |
| Search | Forced dynamic |
| API routes | Dynamic |
| Sitemap and robots | Metadata routes |

WordPress helper failures generally return empty arrays or `null` instead of
throwing. This keeps pages available during CMS failures, but it also hides
operational errors because most exceptions are silently swallowed.

## 8. Current Verification Status

Reviewed on June 14, 2026:

- `npm.cmd run build`: passed.
- Next.js version resolved by the lockfile: `15.5.19`.
- Production build generated 19 pages/routes successfully.
- `npm.cmd run lint`: could not run because ESLint is not configured; Next.js
  opened an interactive configuration prompt.
- Automated tests: none are configured.
- Existing uncommitted change in `app/page.jsx`: preserved.

The passing build proves that the current code compiles and prerenders. It does
not validate route correctness, WordPress data quality, admin security, or
browser behavior.

## 9. Maintenance Priorities

1. Fix quiz selection so the homepage always reads `daily-quiz`.
2. Correct sitemap URLs and cache-revalidation category paths.
3. Preserve search terms during pagination.
4. Make admin authentication real and validate quiz dates correctly.
5. Remove duplicate sidebar API requests.
6. Correct archive totals after excluding the quiz post.
7. Add ESLint and focused tests for routes, quiz parsing, and URL generation.

See `PROJECT_STRUCTURE.md` for the complete file/call map and `BUG_FIXING.md`
for the issue register and recommended fixes.
