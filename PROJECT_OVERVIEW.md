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
| `NEXT_PUBLIC_ADSENSE_ID` | Public AdSense publisher/client ID |
| `NEXT_PUBLIC_AD_SLOT_TOP` | Top horizontal ad slot |
| `NEXT_PUBLIC_AD_SLOT_MID` | Mid-page horizontal ad slot |
| `NEXT_PUBLIC_AD_SLOT_IN_ARTICLE` | In-article fluid ad slot |
| `NEXT_PUBLIC_AD_SLOT_SIDEBAR` | Sidebar ad slot |
| `NEXT_PUBLIC_AD_SLOT_AFTER_CONTENT` | After-content ad slot |
| `NEXT_PUBLIC_AD_SLOT_BOTTOM` | Bottom horizontal ad slot |
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

The page sitemap also includes crawlable `/author/<slug>` profiles. Sitemap
collection uses the shared WordPress retry policy and aborts rather than
publishing partial XML. Homepage `lastmod` follows the Karachi date rollover.

## 9. Verification Status

Reviewed and updated on June 15, 2026:

| Check | Current result |
| --- | --- |
| JavaScript route syntax checks | Passed for checked `.js` files |
| `git diff --check` | Passed |
| Focused TOC behavior simulation | Passed |
| Admin WordPress lookup simulations | Passed |
| `npm.cmd run build` | Passed on June 15, 2026 using an isolated output directory |
| ESLint | Passed with `npm.cmd run lint` |
| Automated test suite | 13 tests passed with `npm.cmd run test` |

The production build compiled, type-checked, and generated all 28 routes.
Browser checks verified Organization/WebSite, Article, Person, author profile,
canonical, image-priority, no-hydration header, disabled-ad, responsive-image,
and deferred-rendering output. Local HTTP checks verified sitemap author
entries, homepage `lastmod`, and extracted images.

The final performance build reports approximately `634 B` of route-specific
JavaScript for the homepage, `637 B` for blog/tag archives, and `2.57 kB` for
article routes. The shared `102 kB` is primarily the Next.js/React runtime.

## 10. Remaining Improvements

### Required functional fixes

1. Fix quiz parsing so a question does not need to end with `?`.
2. Show a visible temporary-unavailable message when quiz HTML is missing or
   malformed instead of rendering an empty quiz section.

### Remaining SEO and deployment validation

1. Verify after deployment that valid category and article URLs return their
   own content instead of redirecting to `/blog`.
2. Confirm the production domain is serving this repository's metadata,
   schema, sitemap, canonical, and routing implementation.

Paginated blog, category, and tag canonicals are already self-referencing and
are no longer part of the remaining work.

Engineering safeguards completed on June 15, 2026:

- ESLint 9 with the Next.js Core Web Vitals rules runs non-interactively.
- The native Node test suite covers quiz validation/escaping, pagination,
  canonical generation, archive validation, Karachi midnight, WordPress
  missing-versus-unavailable behavior, and body-image processing.
- WordPress body images retain existing responsive markup or receive inferred
  dimensions, fallback dimensions, responsive Next.js optimizer sources,
  `sizes`, lazy loading, and asynchronous decoding.

See `PROJECT_STRUCTURE.md` for the file and call map. See `BUG_FIXING.md` for
the issue history, resolved changes, and open work. See `SEO_ANALYSIS.md` for
the detailed technical, on-page, content, and performance SEO audit.
