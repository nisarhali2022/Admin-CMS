# Telenor Quiz Project Overview

## 1. Purpose

This repository contains a content-focused website for daily Telenor quiz
answers, telecom/news articles, and supporting informational pages.

The application uses:

- WordPress REST API for posts, pages, categories, tags, media, authors, and
  the `daily-quiz` post.
- Static React content for quiz guidance, participation steps, navigation,
  fallback FAQs, and site settings.
- A protected browser admin page for updating the five daily quiz questions.

WordPress is the production data store. The Next.js application has no
separate application database.

## 2. Technology

| Area | Technology |
| --- | --- |
| Framework | Next.js 15 App Router |
| UI | React 19 |
| Styling | Tailwind CSS 3 and Typography plugin |
| CMS | WordPress REST API v2 |
| Rendering | Static generation, ISR, and dynamic server rendering |
| Images | `next/image` with approved WordPress remote images |
| Ads | Google AdSense integration |
| Language | JavaScript and JSX |

## 3. Main Features

- Daily quiz answers on the homepage.
- Dynamic Karachi date that changes daily without requiring a quiz update.
- Latest-news homepage cards.
- Category, tag, blog, and search archives with pagination.
- Canonical `/<category>/<post>` article routes.
- Related posts, table of contents, breadcrumbs, share buttons, and sidebar.
- End-of-content WordPress author profile on article pages.
- SEO metadata, JSON-LD, robots output, and split XML sitemaps.
- Protected five-question quiz editor.
- On-demand and scheduled cache revalidation.
- Temporary-unavailable pages for repeated WordPress failures.

## 4. Architecture

1. A request enters a route under `app/`.
2. Server components call `lib/wordpress.js`.
3. `lib/wordpressConfig.js` supplies the shared WordPress API URL.
4. WordPress responses use Next.js caching and revalidation.
5. Helpers parse quiz HTML, generate TOC IDs, format dates, and build URLs.
6. Route components compose reusable components from `components/`.
7. Client components provide search, sharing, navigation, ads, and admin
   interactions.

Most public content uses one-hour ISR caching. WordPress requests retry once
for network failures, HTTP 429/5xx responses, and invalid JSON.

## 5. Core Flows

### Homepage

`app/page.jsx` loads these resources in parallel:

```text
getDailyQuizPost()
getPosts({ perPage: 6, excludeSlugs: ["daily-quiz"], tag: "news" })
```

`getDailyQuizPost()` explicitly requests the fixed WordPress slug
`daily-quiz` and uses the `quiz` cache tag. Publishing a newer normal article
cannot replace the homepage quiz.

The page parses quiz tables and FAQs, calculates the current
`Asia/Karachi` date, and renders quiz answers, latest news, information
sections, participation steps, ads, FAQs, and the sidebar.

Homepage Latest News cards intentionally do not display publication dates.

### Category and Blog Archives

Category routes use `app/[slug]/page.jsx`; `/blog` uses
`app/blog/page.jsx`. Both exclude `daily-quiz` through the WordPress query so
pagination totals remain correct.

Visible publication dates are hidden on category and blog cards. Search and
tag archives retain their current date presentation.

### Article

`app/[slug]/[post_slug]/page.jsx`:

1. Fetches the post by `post_slug`.
2. Resolves its primary category.
3. Permanently redirects an incorrect category prefix.
4. Generates valid, unique TOC IDs.
5. Inserts the React in-article ad after the first paragraph.
6. Renders the author profile after the WordPress content.
7. Renders sharing controls and related posts.

The visible publication date is hidden on the article and its related cards.
Published and modified dates remain in Open Graph and JSON-LD metadata for
search engines.

### Quiz Administration

The admin flow is:

```text
POST /api/admin/session
  -> validate ADMIN_SECRET
  -> create signed HTTP-only session cookie

GET /api/quiz
  -> load the existing daily-quiz post

POST /api/quiz
  -> validate exactly five questions and four options each
  -> HTML-escape all stored fields
  -> confirm whether daily-quiz exists
  -> update with PUT or create with POST
  -> revalidateTag("quiz")
```

The WordPress existence lookup returns `null` only after a successful empty
array response. Network, rate-limit, server, malformed-JSON, or malformed-data
failures retry once and then return HTTP 503. The save is stopped, preventing
an outage from being mistaken for a missing post.

### Daily Date Refresh

`vercel.json` calls `/api/cron/midnight` at `19:00 UTC`, which is midnight in
Karachi. The endpoint revalidates `/`; the next request regenerates the
homepage with the new date even when quiz answers were not edited.

## 6. Current UI Behavior

- Article breadcrumbs allow substantially more title text before truncating:
  up to `70vw`, `420px` on small screens, and `560px` on large screens.
- Sidebar cards have a consistent `24px` vertical gap.
- The sidebar currently renders Recent Posts, Popular Posts, and Categories.
  Its Search and advertisement cards are not rendered.
- Article pages display an author box with name, optional description, and
  avatar or initial fallback.
- Article and dynamic WordPress page templates render one visible page-title
  H1.
- Visible publish dates are hidden from articles, related cards, blog cards,
  category cards, and homepage Latest News cards.
- The root document uses `lang="en-PK"`, placeholder social profiles are
  removed, and AdSense does not load while its publisher ID is a placeholder.
- A branded 1200x630 fallback social image is available at
  `public/og-default.jpg`.

## 7. Configuration

| Variable | Purpose |
| --- | --- |
| `WORDPRESS_API_URL` | Preferred server-side WordPress REST API URL |
| `NEXT_PUBLIC_WORDPRESS_API_URL` | Backward-compatible URL fallback |
| `WP_ADMIN_USER` | WordPress API username |
| `WP_ADMIN_PASS` | WordPress application password |
| `ADMIN_SECRET` | Admin login and session-signing secret |
| `REVALIDATE_SECRET` | Protects POST cache revalidation |
| `CRON_SECRET` | Protects scheduled midnight revalidation |

Site constants, route sizes, AdSense slots, navigation, colors, images, and
the one-hour revalidation duration are defined in `lib/constants.js`.

## 8. Sitemaps

The site publishes:

- `/sitemap_index.xml`
- `/post-sitemap.xml`
- `/page-sitemap.xml`
- `/category-sitemap.xml`

Post URLs use `/<category>/<post>`; categories use `/<category>`; pages use
`/<page>`. Non-root URLs consistently omit trailing slashes, and `robots.txt`
points to the sitemap index.

## 9. Verification Status

Reviewed and updated on June 14, 2026:

| Check | Current result |
| --- | --- |
| JavaScript route syntax checks | Passed for checked `.js` files |
| `git diff --check` | Passed |
| Focused TOC behavior simulation | Passed |
| Admin WordPress lookup simulations | Passed |
| `npm.cmd run build` | Passed using an isolated output directory while the development server owned `.next` |
| ESLint | Not configured |
| Automated test suite | Not configured |

The production build compiled, type-checked, and generated all 28 routes. A
non-fatal Windows warning occurred while renaming one temporary webpack cache
file after route generation.

## 10. Remaining Improvements

### High priority

1. Fix quiz parsing so a question does not need to end with `?`.
2. Show a visible temporary-unavailable message when quiz HTML is missing or
   malformed instead of rendering an empty quiz section.
3. Add automated tests for quiz selection, parsing, admin lookup failures,
   pagination, sitemap URLs, and Karachi midnight behavior.

### Medium priority

1. Implement real ad-slot selection for `AdBanner` position values.
2. Correct the Merriweather/Tailwind font mapping.
3. Add non-interactive ESLint configuration.

### Low priority

1. Add `per_page=1` to the public `daily-quiz` slug request.
2. Remove remaining unused imports, including sidebar search/ad imports while
   those cards remain disabled, and correct stale comments.
3. Add browser-level checks for responsive breadcrumbs, sidebar spacing,
   author profiles, and hidden publication dates.

See `PROJECT_STRUCTURE.md` for the file and call map. See `BUG_FIXING.md` for
the issue history, resolved changes, and open work. See `SEO_ANALYSIS.md` for
the detailed technical, on-page, content, and performance SEO audit.
