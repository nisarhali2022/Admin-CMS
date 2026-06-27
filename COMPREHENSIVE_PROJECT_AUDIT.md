# Comprehensive Project Audit

Audit date: 2026-06-27  
Public domain reviewed: https://telenorquiztoday.com.pk  
Project type: Next.js App Router frontend with WordPress REST API backend

## 1. Executive Summary

The project is in a solid technical state overall. The public site loads from
Vercel, the non-www domain is canonical, WordPress is consumed through the REST
API, the homepage has one H1, the major XML sitemaps are live, `ads.txt` is
authorized, and the local build/test/lint checks pass.

The main remaining risks are not fundamental architecture problems. They are
mostly content-quality, trust-page metadata, contact-form functionality,
security-header hardening, ad/layout monitoring, and a few maintainability
items.

## 2. Verification Performed

### Local checks

| Check | Result |
| --- | --- |
| `npm.cmd run test` | Passed: 36 tests |
| `npm.cmd run lint` | Passed |
| `npm.cmd run build` | Passed: 29 routes generated |
| Unsandboxed production build with WordPress access | Passed |
| Static stale-doc scan | Only the intentionally open quiz-fallback item remains |
| Static secret/backend scan | No tracked private password found; public GA/AdSense IDs are in constants |

Build output summary:

- Homepage route-specific JS: `1.38 kB`, first-load JS: `116 kB`.
- Article route-specific JS: `1.75 kB`, first-load JS: `116 kB`.
- Blog/tag archive route-specific JS: `2.88 kB`, first-load JS: `114 kB`.
- Shared first-load JS: `102 kB`.

### Live URL checks

| URL | Result |
| --- | --- |
| `/` | 200 |
| `https://www.telenorquiztoday.com.pk/` | 308 to non-www |
| `/robots.txt` | 200 |
| `/ads.txt` | 200 |
| `/sitemap_index.xml` | 200, 3 sitemap entries |
| `/page-sitemap.xml` | 200, 10 URL entries |
| `/post-sitemap.xml` | 200, 108 URL entries |
| `/category-sitemap.xml` | 200, 6 URL entries |
| `/sitemap.xml` | 308 to `/sitemap_index.xml` |
| `/telecom` | 200 |
| `/blog` | 200 |
| `/contact-us` | 200 |
| `/about-us` | 200 |
| unknown test URL | 404 |

### Live metadata spot checks

| Page | Status | H1 count | Canonical | Notes |
| --- | ---: | ---: | --- | --- |
| Home | 200 | 1 | `https://telenorquiztoday.com.pk` | Title includes current daily date |
| Telecom | 200 | 1 | `/telecom` | Category page is reachable |
| Blog | 200 | 1 | `/blog` | Archive page is reachable |
| Contact | 200 | 1 | `/contact-us` | Description is short |
| About | 200 | 1 | `/about-us` | Description length is acceptable |
| Terms of Service | 200 | 1 | `/terms-of-service` | Title is `- Telenor Quiz Today` |
| Disclaimer | 200 | 1 | `/disclaimer` | Title is `- Telenor Quiz Today` |

### PageSpeed limitation

The PageSpeed Insights API returned HTTP `429 Too Many Requests` for both
mobile and desktop during this audit. Performance findings below therefore use
local build output, source review, live response checks, and known browser/Core
Web Vitals behavior. Re-run PageSpeed manually after deployment for current lab
scores.

## 3. Current Strengths

- Non-www canonical domain is working; `www` performs one permanent redirect.
- `robots.txt` allows public crawling and points to the sitemap index.
- `ads.txt` contains the expected Google AdSense seller line.
- Split sitemap structure is live and crawlable.
- Homepage, category, blog, contact, and about pages have one visible H1.
- Post routes enforce canonical `/<category>/<post>` prefixes.
- Search and tag pages are noindex/follow where appropriate.
- Homepage quiz explicitly fetches `daily-quiz`.
- Quiz parser handles fill-in-the-blank questions without requiring `?`.
- WordPress request failures retry and surface temporary-unavailable states.
- Header is fixed on desktop/mobile, with anchor offsets for TOC/hash links.
- AdSense duplicate-push errors are guarded.
- Image optimization uses `next/image`, local public assets, AVIF/WebP, and
  env-derived WordPress media host.
- Security baseline includes HTTPS, HSTS, `X-Frame-Options: DENY`, and
  `X-Content-Type-Options: nosniff`.

## 4. Critical Findings

No critical blockers were confirmed in the current source and live checks.
Important public URLs are reachable, the sitemap index is live, and the build
passes.

## 5. High-Priority Findings

### HIGH-01: Empty or malformed quiz content renders no visible fallback

**Status:** Resolved in source after this audit.

**Area:** UX, SEO, reliability  
**Evidence:** `components/home/QuizAnswerCards.jsx` returns `null` when
`questions` is empty. `BUG_FIXING.md` still tracks this as open.  
**Impact:** If WordPress quiz HTML is malformed or temporarily incomplete, the
homepage can show the quiz section heading followed by empty space. This is bad
for users, daily-search intent, and crawl quality.  
**Recommended fix:** Render a visible fallback card such as "Quiz answers are
temporarily unavailable. Please check again shortly." Log malformed quiz
content server-side.  
**Verification:** Simulate empty quiz HTML and confirm the fallback appears
under the quiz heading.

### HIGH-02: Contact form does not deliver or store messages

**Area:** UX, functionality, trust  
**Evidence:** `components/contact/ContactForm.jsx` prevents default submission,
resets the form, and shows a local success message. There is no API route,
email provider, database, or storage integration.  
**Impact:** Users believe a message was submitted, but the site owner cannot
review it. This weakens trust pages, corrections workflows, and user support.  
**Recommended fix:** Add a real `POST /api/contact` route with spam protection,
server-side validation, and delivery to email or storage. Keep the current
client success message only after the API returns success.  
**Verification:** Submit a test message and confirm it arrives in the chosen
inbox/storage with timestamp, page source, and sender fields.

### HIGH-03: Terms and Disclaimer metadata titles are broken

**Status:** Resolved in source after this audit.

**Area:** SEO, trust pages  
**Evidence:** Live `/terms-of-service` and `/disclaimer` return status 200 and
one H1, but both have title `- Telenor Quiz Today`.  
**Impact:** Search snippets and browser tabs look incomplete. These pages are
important trust/compliance pages and should not have empty titles.  
**Recommended fix:** Update the WordPress page titles/Yoast titles or add
static Next.js routes for `/terms-of-service` and `/disclaimer` with explicit
metadata.  
**Verification:** Source should show `<title>Terms of Service | Telenor Quiz
Today</title>` and `<title>Disclaimer | Telenor Quiz Today</title>`.

### HIGH-04: Live Core Web Vitals need fresh verification

**Area:** Performance, SEO  
**Evidence:** PageSpeed API returned 429 during this audit. The local build is
healthy, but field and lab performance with ads active was not verified.  
**Impact:** Google ranking and user experience depend on real LCP, CLS, and INP
data. AdSense can materially change results after live fill.  
**Recommended fix:** Re-run PageSpeed mobile and desktop manually, then verify
Search Console Core Web Vitals once field data is available. Record results in
the performance report.  
**Verification:** PageSpeed report should include LCP, CLS, INP/TBT, FCP,
render-blocking resources, image-delivery warnings, and third-party script
cost.

## 6. Medium-Priority Findings

### MED-01: Security headers are incomplete

**Area:** Security  
**Evidence:** Live headers include HSTS, `X-Frame-Options`, and
`X-Content-Type-Options`, but no `Content-Security-Policy`,
`Referrer-Policy`, or `Permissions-Policy`.  
**Impact:** The baseline is good, but the site has less protection against
script injection impact, referrer leakage, and unnecessary browser APIs.  
**Recommended fix:** Add a report-only CSP first because AdSense/Analytics need
careful allowlists. Add `Referrer-Policy: strict-origin-when-cross-origin` and
a conservative `Permissions-Policy`.  
**Verification:** Recheck response headers and confirm ads/analytics still
work.

### MED-02: About and Privacy pages can duplicate H1s from WordPress content

**Status:** Resolved in source after this audit.

**Area:** SEO, accessibility  
**Evidence:** Generic WordPress pages call `removeContentH1Blocks()`, but
`app/about-us/page.jsx` and `app/privacy-policy/page.jsx` render a page H1 and
then render WordPress content without removing body H1 blocks.  
**Impact:** If WordPress content contains a manual H1, these pages can have
multiple H1s.  
**Recommended fix:** Apply `removeContentH1Blocks()` before rendering
WordPress content on special page templates too.  
**Verification:** Add tests or source checks confirming public special pages
cannot render body H1 blocks.

### MED-03: Category pages still use classic pagination

**Area:** UX, mobile usability  
**Evidence:** `app/[slug]/page.jsx` renders `Pagination` for category archives.  
**Impact:** The user-requested infinite scroll behavior is not implemented.
Pagination is SEO-safe but less fluid for mobile browsing.  
**Recommended fix:** Keep page 1 server-rendered for SEO, add a route handler
for additional category pages, and use an IntersectionObserver client component
to append posts while preserving a no-JS fallback link.  
**Verification:** `/telecom` loads first-page content in HTML; scrolling loads
more posts without duplicates; direct `?page=2` remains valid or redirects by
policy.

### MED-04: Sidebar sticky offset is slightly smaller than fixed desktop header

**Status:** Resolved in source after this audit.

**Area:** UX  
**Evidence:** `Sidebar` uses `lg:sticky lg:top-20` (80px). The fixed desktop
header spacer is `md:h-[5.5rem]` (88px).  
**Impact:** Sidebar cards can sit slightly too close to or under the fixed
header on desktop.  
**Recommended fix:** Increase sidebar sticky top to match or exceed the fixed
header offset, for example `lg:top-28`.  
**Verification:** Scroll desktop category/post pages and confirm the sidebar
does not tuck under the fixed header.

### MED-05: Ad slots all use the same AdSense slot ID

**Status:** Partially resolved in source after this audit. The code now supports
separate env-configured slot IDs while falling back to the current slot until
new AdSense units are created.

**Area:** Ads, RPM diagnostics  
**Evidence:** `AD_SLOTS` maps top, mid, in-article, sidebar, after-content,
and bottom to `4404658448`.  
**Impact:** Monetization works, but reporting cannot distinguish which
placement earns or harms performance.  
**Recommended fix:** Create separate AdSense ad units for each placement and
map each placement to its own slot ID.  
**Verification:** AdSense reports should show separate performance for top,
mid, in-article, sidebar, after-content, and bottom.

### MED-06: Ad containers can create large blank spaces when unfilled

**Status:** Improved in source after this audit. Non-top ad containers can now
collapse after AdSense explicitly reports an unfilled ad.

**Area:** UX, ads  
**Evidence:** `AdBanner` reserves `min-h-[250px]` on mobile and `sm:min-h-[120px]`.
Earlier observations showed `data-ad-status="unfilled"` can occur.  
**Impact:** Reserving space protects CLS, but unfilled ads can create large
blank gaps, especially near the top of the homepage.  
**Recommended fix:** Keep CLS-safe dimensions, but monitor unfilled rate. If
unfilled is frequent, reduce top blank height, reposition ads lower, or show a
compliant neutral placeholder only if allowed by AdSense policy.  
**Verification:** Inspect live ad status on mobile and review AdSense fill rate
by placement.

### MED-07: Contact page description is short

**Status:** Resolved in source after this audit.

**Area:** SEO, trust  
**Evidence:** Live `/contact-us` description length is 36 characters.  
**Impact:** Search snippets are less useful, and the page gives weak context to
users and crawlers.  
**Recommended fix:** Expand the meta description to explain corrections,
questions, feedback, and independent operation.  
**Verification:** Live source should show a 120-160 character description.

### MED-08: Public tracking/ad IDs are hardcoded in constants

**Area:** Maintainability, deployment  
**Evidence:** `lib/constants.js` contains GA ID, Search Console verification,
and AdSense publisher ID. These are not secrets, but they are deployment
configuration.  
**Impact:** Preview/staging deployments can accidentally report data into
production Analytics/AdSense.  
**Recommended fix:** Prefer environment variables for public tracking IDs,
with static fallback only if needed. Keep `ads.txt` static.  
**Verification:** Vercel production uses real IDs; preview either disables ads
or uses test-safe configuration.

### MED-09: Local AdSense requests return 403 on localhost

**Status:** Documented in source after this audit.

**Area:** Ads, developer experience
**Evidence:** Local console requests to
`googleads.g.doubleclick.net/pagead/ads` include
`url=http://localhost:3000/` and return HTTP `403`.
**Impact:** No production code crash; local console noise can confuse testing.
**Recommended fix:** Treat as expected for localhost or add a dev-only ad
placeholder later. Verify real ad behavior only on the approved production
domain.
**Verification:** See `ADSENSE_CONSOLE_ERROR_REPORT.md`.

## 7. Low-Priority Findings

### LOW-01: `FooterRecentPosts.jsx` appears unused

**Status:** Resolved in source after this audit.

**Area:** Maintainability  
**Evidence:** Static reference scan originally found
`components/layout/FooterRecentPosts.jsx` defined but not imported.  
**Impact:** Resolved; the unused helper was removed.  
**Recommended fix:** No further source change needed.  
**Verification:** `rg FooterRecentPosts` should return only documentation or
test references.

### LOW-02: `SearchWidget` is present but commented out in Sidebar

**Status:** Resolved in source after this audit.

**Area:** Maintainability, UX  
**Evidence:** `Sidebar.jsx` originally contained a commented search widget
block, while `SearchWidget.jsx` and `useSearch.js` remained.  
**Impact:** Resolved; the commented sidebar block and unused files were
removed.  
**Recommended fix:** No further source change needed.  
**Verification:** Sidebar behavior and source match the intended design.

### LOW-03: Static trust pages could use richer internal linking

**Area:** SEO, AEO  
**Evidence:** Editorial/corrections pages are valid, but they are short and
could link more explicitly to Contact, About, Privacy, Terms, and Disclaimer.  
**Impact:** Trust signals are present but lightweight.  
**Recommended fix:** Add concise internal links and explain correction/review
workflow in more detail.  
**Verification:** Trust pages should be useful without feeling templated.

### LOW-04: PageSpeed reports in repo are historical

**Area:** Documentation  
**Evidence:** `lighthouse-performance-report*.md` are marked historical, and
current PageSpeed API access was rate-limited.  
**Impact:** Future optimization decisions may rely on old metrics.  
**Recommended fix:** Add a new dated PageSpeed report after manual testing.  
**Verification:** Latest performance report should show the final domain,
date, mobile/desktop scores, and ad-fill context.

## 8. AEO Review

Current AEO strengths:

- Homepage answers user intent directly near the top.
- FAQ section exists and can be extracted by search/AI systems.
- Editorial and corrections policies support trust.
- Author pages and article author boxes support entity clarity.
- Structured data exists for site identity, articles, breadcrumbs, and authors.

AEO improvements:

1. Add a short "quick answer" block above long explanatory sections for the
   daily quiz, using plain text that answers the main query immediately.
2. Make FAQ answers concise and self-contained; avoid relying on preceding
   paragraphs for context.
3. Add "last checked" or "updated at" only if it is accurate and automated.
4. Add clearer source/methodology copy explaining how quiz answers are verified.
5. Avoid excessive keyword repetition; AI search prefers natural, precise,
   source-backed answers.

## 9. Prioritized Action List

1. Connect Contact form to real email/storage or change copy so it does not
   imply delivery.
2. Re-run PageSpeed mobile/desktop and document current CWV risks.
3. Add Referrer-Policy, Permissions-Policy, and report-only CSP.
4. Create separate AdSense units in AdSense and set the corresponding
   `NEXT_PUBLIC_AD_SLOT_*` variables in Vercel.
5. Decide and implement category infinite scroll while preserving SEO fallback.
6. Expand AEO quick-answer, verification-method, and trust-page copy.
7. Move public tracking/ad IDs to environment variables if preview/staging
    isolation matters.

Recently resolved in source:

- Added visible fallback for missing/malformed quiz content.
- Fixed `/terms-of-service` and `/disclaimer` metadata titles.
- Stripped WordPress body H1s on About and Privacy special routes.
- Adjusted sidebar sticky top offset for the fixed header.
- Added per-placement AdSense slot configuration support with fallback.
- Added non-top unfilled ad container collapse handling.
- Removed unused `FooterRecentPosts.jsx`, `SearchWidget.jsx`, and
  `hooks/useSearch.js`.
- Expanded Contact page metadata description.
- Documented local AdSense `403` behavior in
  `ADSENSE_CONSOLE_ERROR_REPORT.md`.
- Updated homepage quiz options to a 2x2 grid and current typography defaults
  to 16px readable text.

## 10. References

- Google Search Central SEO Starter Guide:
  https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google Search Central robots.txt:
  https://developers.google.com/search/docs/crawling-indexing/robots/intro
- Google Search Central sitemaps:
  https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
- Google Search Central structured data:
  https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- web.dev Core Web Vitals:
  https://web.dev/vitals/
- Google AdSense policies:
  https://support.google.com/adsense/answer/48182
- Next.js App Router metadata:
  https://nextjs.org/docs/app/building-your-application/optimizing/metadata
- Next.js image optimization:
  https://nextjs.org/docs/app/getting-started/images
