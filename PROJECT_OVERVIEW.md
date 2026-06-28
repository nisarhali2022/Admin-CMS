# Telenor Quiz Project Overview

## 1. Purpose

This repository contains a content-focused website for daily Telenor quiz
answers, telecom/news articles, and supporting informational pages.

The application uses:

- WordPress REST API for posts, pages, categories, tags, media, authors, and
  the `daily-quiz` post.
- Static React content for quiz guidance, participation steps, navigation,
  local public assets, fallback FAQs, and site settings.
- A protected browser admin page for updating the five daily quiz questions.

WordPress is the production data store. The Next.js application has no
separate application database.

## 2. Technology

| Area | Technology |
| --- | --- |
| Framework | Next.js 15 App Router |
| UI | React 19 |
| Styling | Tailwind CSS 3 with compact custom article/prose styles |
| CMS | WordPress REST API v2 |
| Rendering | Static generation, ISR, and dynamic server rendering |
| Images | `next/image`, local public assets, and env-derived WordPress media host |
| Ads | Google AdSense integration |
| Language | JavaScript and JSX |

## 3. Main Features

- Daily quiz answers on the homepage.
- Homepage quiz cards use a form-like public display with a blue header,
  numbered question label, bordered question box without a separate question
  label, 15px question/option text, 2x2 option grid, green correct-option
  marker, and green answer box.
- Dynamic Karachi date that changes daily without requiring a quiz update.
- Homepage SEO date that moves six hours earlier than the visible date for
  metadata, schema, and sitemap freshness.
- Latest News homepage cards with the two newest posts fixed first and four
  randomized cards selected client-side from the remaining post pool.
- Category, tag, blog, and search archives with pagination.
- Canonical `/<category>/<post>` article routes.
- Related posts, table of contents, breadcrumbs, share buttons, and sidebar.
- End-of-content WordPress author profile on article pages.
- SEO metadata, JSON-LD, robots output, and split XML sitemaps.
- Protected five-question quiz editor.
- On-demand and scheduled cache revalidation.
- Temporary-unavailable pages for repeated WordPress failures.
- Fixed desktop/mobile header with global anchor offsets for TOC/hash links.

## 4. Architecture

1. A request enters a route under `app/`.
2. Server components call `lib/wordpress.js`.
3. `lib/wordpressConfig.js` supplies the shared WordPress API URL from
   environment variables only.
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
getLatestPostCards(60)
```

`getDailyQuizPost()` explicitly requests the fixed WordPress slug
`daily-quiz` and uses the `quiz` cache tag. Publishing a newer normal article
cannot replace the homepage quiz.

The page parses quiz tables and FAQs, calculates the current
`Asia/Karachi` date, and renders quiz answers, latest news, information
sections, participation steps, ads, FAQs, and the sidebar.

Homepage Latest News cards intentionally do not display publication dates.
The first two cards are the newest WordPress posts; cards three through six
are randomized in the browser from the rest of the fetched pool on reload.

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

`vercel.json` calls `/api/cron/midnight` twice:

- `13:00 UTC` / `18:00 PKT` for the six-hour early SEO date refresh.
- `19:00 UTC` / `00:00 PKT` for the visible homepage date refresh.

The endpoint revalidates `/`, `/sitemap_index.xml`, and `/page-sitemap.xml`;
the next request regenerates the homepage and sitemap freshness values even
when quiz answers were not edited.

## 6. Current UI Behavior

- Article breadcrumbs allow substantially more title text before truncating:
  up to `70vw`, `420px` on small screens, and `560px` on large screens.
- Sidebar cards have a consistent `24px` vertical gap.
- The sidebar currently renders Recent Posts, Popular Posts, and Categories
  without visible publication dates. Its Search and advertisement cards are
  not rendered. Recent and Popular post titles intentionally use compact
  `text-sm` styling while normal body text remains 16px.
- The footer is a static four-column layout with About, Menu, More Link, and
  Disclaimer content plus real social profile icon links. It no longer fetches
  WordPress posts.
- The header is fixed on desktop and mobile. A spacer prevents content from
  hiding under it, and global `scroll-padding` / `scroll-margin` offsets keep
  TOC/hash targets visible below the header.
- Article pages display an author box with name, optional description, and
  avatar or initial fallback.
- Global body, prose, article, quiz, and general non-heading text default to
  16px. Heading sizes remain controlled by heading classes.
- Article and dynamic WordPress page templates render one visible page-title
  H1.
- Visible publish dates are hidden from articles, related cards, blog cards,
  category cards, and homepage Latest News cards.
- The root document uses `lang="en-PK"`, and AdSense does not load while its
  publisher ID is a placeholder.
- A branded 1200x630 fallback social image is available at
  `public/og-default.jpg`.
- Fixed logo, favicon, and homepage participation-step images are served from
  `public/assets/` so they do not depend on the old WordPress uploads path
  after the main domain moves to Vercel.

## 7. Configuration

| Variable | Purpose |
| --- | --- |
| `WORDPRESS_API_URL` | Required server-side WordPress REST API URL |
| `NEXT_PUBLIC_WORDPRESS_API_URL` | Backward-compatible URL fallback |
| `WP_ADMIN_USER` | WordPress API username |
| `WP_ADMIN_PASS` | WordPress application password |
| `ADMIN_SECRET` | Admin login and session-signing secret |
| `REVALIDATE_SECRET` | Protects POST cache revalidation |
| `CRON_SECRET` | Protects scheduled midnight revalidation |

Site constants, route sizes, Google Analytics ID, Search Console verification
token, AdSense publisher ID, AdSense slots, navigation, colors, local image
paths, and the one-hour revalidation duration are defined in
`lib/constants.js`.

`WORDPRESS_API_URL` must be configured in Vercel, for example:

```text
WORDPRESS_API_URL=https://wp.example-domain.test/wp-json/wp/v2
```

There is no hardcoded WordPress API fallback in tracked source. Local secrets
and the real local API URL live in `.env.local`, which is ignored by Git.

## 8. Deployment Model

The intended production architecture is headless WordPress:

```text
https://telenorquiztoday.com.pk
  -> Vercel
  -> public Next.js website

https://wp.telenorquiztoday.com.pk
  -> Hostinger
  -> WordPress admin, media, and REST API backend
```

The main domain remains in `SITE_CONFIG.url` and `SITE_CONFIG.siteUrl` because
it is the public canonical website URL for metadata, schema, sitemaps, robots,
and share links. It does not mean the domain must remain hosted on Hostinger.

The WordPress backend URL must be supplied through Vercel environment
variables. The `wp.` subdomain should remain on Hostinger and should not be
deleted when the root domain DNS is pointed to Vercel.

## 9. Sitemaps

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

## 10. Verification Status

Reviewed and updated on June 27, 2026:

| Check | Current result |
| --- | --- |
| Hardcoded backend/API secret scan | Passed: no tracked-source backend URL or secret matches |
| `.env.local` tracking check | Passed: ignored by `.gitignore` and not tracked |
| JavaScript route syntax checks | Covered by lint/build |
| `git diff --check` | Previously passed; current verification focused on lint/test/build |
| Focused TOC behavior simulation | Covered by automated tests and build |
| Admin WordPress lookup simulations | Covered by automated tests |
| `npm.cmd run build` | Passed on June 27, 2026 |
| ESLint | Passed with `npm.cmd run lint` |
| Automated test suite | 45 tests passed with `npm.cmd run test` |

The production build compiled, linted, type-checked, and generated all 29 routes.
Browser checks verified Organization/WebSite, Article, Person, author profile,
canonical, image-priority, no-hydration header, disabled-ad, responsive-image,
and deferred-rendering output. Local HTTP checks verified sitemap author
entries, homepage `lastmod`, and extracted images.

The final performance build reports approximately `628 B` of route-specific
JavaScript for the homepage, `630 B` for blog/tag archives, and `2.56 kB` for
article routes. The shared `102 kB` is primarily the Next.js/React runtime.

## 11. Remaining Improvements

### Required functional fixes

1. Connect the public contact form to a real delivery/storage backend if
   submitted messages need to be reviewed later. The current form intentionally
   prevents insecure `mailto:` submission and shows a local success message.
2. Category pages still use classic pagination. Infinite scroll for category
   archives has been requested but has not been implemented yet.

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

Additional migration safeguards completed on June 19, 2026:

- WordPress API configuration is environment-only.
- Fixed public assets were moved from WordPress upload URLs into
  `public/assets/`.
- `next.config.js` derives the WordPress media host from `WORDPRESS_API_URL`.
- Tracked source contains no hardcoded backend API URL, WordPress backend host,
  WordPress API path, old main-domain upload path, or hardcoded local
  passwords/secrets.

See `PROJECT_STRUCTURE.md` for the file and call map. See `BUG_FIXING.md` for
the issue history, resolved changes, and open work. See `SEO_ANALYSIS.md` for
the detailed technical, on-page, content, and performance SEO audit.

## Latest Update - 2026-06-20

The project is now configured for the public Next.js site to run on Vercel while
WordPress remains the backend CMS on `wp.telenorquiztoday.com.pk`.

Latest completed work:

- Google Analytics, Google Search Console verification, and Google AdSense IDs
  are static application constants in `lib/constants.js`.
- `public/ads.txt` is static and contains the authorized Google AdSense seller
  line.
- The global AdSense script uses `lazyOnload` to reduce Core Web Vitals impact.
- Top ad placement loads eagerly; lower, sidebar, and in-article ad placements
  load through an `IntersectionObserver` before the user reaches them.
- Homepage Latest News cards and sidebar Recent Posts now randomize client-side
  from larger WordPress post pools.
- Footer social links were updated for LinkedIn, Facebook, X, Instagram,
  YouTube, TikTok, and Pinterest.
- Contact page now renders a public contact form layout and no longer exposes
  backend WordPress page content directly.
- About page alignment was improved with a cleaner content card layout.
- Rendered WordPress content rewrites visible backend `wp.` email/URL text to
  public root-domain text while keeping media, API, and admin system paths
  intact.
- Mobile header overflow was fixed, horizontal page overflow is hidden, and the
  mobile menu closes when a menu item is selected.
- `/sitemap.xml` now redirects to `/sitemap_index.xml`, which remains the
  preferred sitemap submitted to Google Search Console.
- `robots.txt` allows the public site, disallows `/api/`, and points crawlers to
  the sitemap index.

Current production note:

- If AdSense markup loads but the slot does not visually show an ad, check the
  slot status in DevTools. `data-ad-status="unfilled"` means Google loaded the
  ad request but did not return inventory; that is an AdSense fill issue, not a
  rendering bug in the project.

## Latest Update - 2026-06-27

Recent completed work:

- Header was changed from sticky to truly fixed on desktop and mobile with a
  matching layout spacer.
- Global anchor offsets were added so homepage TOC and article/page hash links
  stop below the fixed header.
- Homepage TOC uses clean hyphen anchor IDs and includes the visible H1, H2
  sections, and step H3 entries.
- Quiz parsing now accepts fill-in-the-blank question text that does not end
  with a question mark.
- Homepage SEO date now updates six hours early for metadata, WebPage schema,
  `/page-sitemap.xml`, and `/sitemap_index.xml`; visible content date still
  changes at midnight Karachi time.
- Contact form no longer uses insecure `mailto:` submission. It prevents
  navigation away from the page, resets the fields, and shows a success
  message.
- AdSense unit initialization now avoids duplicate `adsbygoogle.push()` calls
  and catches duplicate-fill errors without crashing the page.
- Global readable text defaults to 16px, with forced font-size `!important`
  rules removed.
- Homepage quiz cards now use a form-like public design: blue card header,
  bordered question box without the previous `Question Text` label, 15px
  question/option text, 2x2 option grid, green correct-option marker, and green
  answer box.
- Sidebar Recent Posts and Popular Posts title snippets intentionally use
  `text-sm` so the five-item sidebar lists stay compact.
- `ADSENSE_CONSOLE_ERROR_REPORT.md` documents local AdSense `403` console
  errors on `localhost` and explains that they are Google ad-serving responses,
  not Next.js build failures.
