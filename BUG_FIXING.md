# Bug-Fixing Review

## 1. Review Result

Review date: June 15, 2026.

Commands checked:

| Check | Result |
| --- | --- |
| `npm.cmd run build` | Passed; all 28 routes generated on June 15, 2026 |
| `npm.cmd run lint` | Passed with no warnings or errors |
| `npm.cmd run test` | Passed: 13 tests |

The current uncommitted change set passed a production build using an isolated
output directory, focused browser/runtime checks, and `git diff --check`. The
following register records behavioral, security, data-integrity, SEO,
performance, UI, and maintainability findings.

## 2. Critical and High-Priority Issues

### BF-01: Homepage does not explicitly fetch the daily quiz

**Severity:** High

**Status:** Resolved on June 14, 2026.

**Files:** `app/page.jsx`, `lib/wordpress.js`

**Problem:** The homepage calls:

```js
getPosts({ page: 1, perPage: 1, tag: 'quiz' })
```

In `getPosts`, `tag` only becomes a Next.js cache tag. It is not sent to
WordPress as a tag or slug filter. The homepage therefore parses whichever
WordPress post is newest.

**Impact:** Publishing any newer article can replace the quiz with unrelated
content or produce no quiz cards.

**Fix:** Fetch the fixed post directly:

```js
const quizPost = await getPostBySlug('daily-quiz')
```

Add cache-tag support to `getPostBySlug`, or create a dedicated
`getDailyQuizPost()` helper with `next: { revalidate, tags: ['quiz'] }`.

**Test:** Publish a normal article newer than `daily-quiz`; the homepage must
still display the daily quiz.

**Implemented result:** The homepage and homepage metadata now call
`getDailyQuizPost()`. This helper explicitly requests
`/posts?_embed&slug=daily-quiz`, caches the response with the `quiz` tag, and
returns only that fixed post. Saving through the quiz API calls
`revalidateTag('quiz')`, so publishing a newer normal article cannot replace
the homepage quiz. The admin lookup also distinguishes a successful empty
WordPress result from an unavailable API: transient failures retry once and
then stop the save with HTTP `503`, preventing an accidental create request.

### BF-02: Sitemap generates invalid category and post URLs

**Severity:** High

**Status:** Resolved on June 14, 2026.

**File:** `app/sitemap.js`

**Problems:**

- `getAllCategorySlugs()` returns objects such as `{ slug: 'tech' }`, but the
  sitemap treats each object as a string. This produces
  `/category/[object Object]`.
- The implemented category route is `/<slug>`, not `/category/<slug>`.
- Posts are emitted as `/<post-slug>`, while normal UI links use
  `/<category-slug>/<post-slug>`.

**Impact:** Search engines receive broken or misleading URLs.

**Fix:**

1. Return category ID/slug data needed for post URL construction.
2. Emit categories as `${base}/${item.slug}`.
3. Fetch each post's category slug, or establish a canonical one-segment post
   route and use it consistently.
4. Add `/blog` if it should be indexed.

**Test:** Generate `sitemap.xml` and assert that it contains no
`[object Object]`, no unsupported `/category/` URLs, and only reachable post
URLs.

**Implemented result:** The site now publishes `/sitemap_index.xml` with
separate `/post-sitemap.xml`, `/page-sitemap.xml`, and
`/category-sitemap.xml` endpoints. Post URLs use
`/<category-slug>/<post-slug>/`, category URLs use `/<category-slug>/`, page
URLs use `/<page-slug>/`, and `robots.txt` points to the sitemap index.

### BF-03: Search pagination drops the search query

**Severity:** High

**Status:** Resolved on June 14, 2026.

**Files:** `app/search/page.jsx`, `components/navigation/Pagination.jsx`

**Problem:** Search passes `basePath="/search"`. Page 2 becomes
`/search?page=2`, so `q` disappears and the route shows the empty-search state.

**Fix:** Allow `Pagination` to receive preserved query parameters, for example:

```jsx
<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  basePath="/search"
  query={{ q: query }}
/>
```

Build URLs with `URLSearchParams`, adding or replacing `page`.

**Test:** From `/search?q=telenor`, click page 2 and confirm the URL contains
both `q=telenor` and `page=2`.

**Implemented result:** `Pagination` now accepts query parameters and builds
links with `URLSearchParams`. Search pagination passes the active `q` value, so
page 2 uses `/search?q=telenor&page=2`, while returning to page 1 keeps
`/search?q=telenor`.

### BF-04: Admin login is only a client-side visual gate

**Severity:** High

**Status:** Resolved on June 14, 2026.

**File:** `app/admin/quiz/page.jsx`

**Problem:** Any non-empty string sets `authed` to `true`. The secret is not
checked until the user saves.

**Impact:** The page presents invalid credentials as a successful login and
loads the quiz editor. This is misleading and encourages storing a sensitive
secret in long-lived React state.

**Fix:** Replace the fake login with a server-validated session:

1. Submit credentials to a dedicated authentication endpoint.
2. Set a secure, HTTP-only, same-site cookie after validation.
3. Protect `/admin/quiz` with middleware or a server layout.
4. Require the session in `POST /api/quiz`.
5. Add `noindex` metadata for the admin route.

At minimum, add a protected verification request before setting `authed`.

**Implemented result:** Login now submits the secret to
`POST /api/admin/session`. The server validates it with a timing-safe
comparison and creates a signed, HTTP-only, same-site session cookie valid for
eight hours. The browser clears the secret after login, `GET` and
`POST /api/quiz` require the valid session, logout deletes the cookie, expired
sessions return to the login screen, and admin pages are marked `noindex`.

### BF-05: Quiz date is ignored and returned in incompatible formats

**Severity:** High

**Status:** Resolved on June 14, 2026.

**Files:** `app/api/quiz/route.js`, `app/admin/quiz/page.jsx`

**Problems:**

- `saveQuizToWordPress(questions, date)` receives `date` but uses `new Date()`
  for the title.
- POST returns the server's current UTC date instead of the submitted date.
- GET returns `post.modified`, which is normally a timestamp, but the admin
  `<input type="date">` requires `YYYY-MM-DD`.

**Impact:** Editing an existing quiz can blank the date input; scheduled or
explicit dates are not honored; UTC and Karachi dates can differ near midnight.

**Fix:** Validate `date` against `/^\d{4}-\d{2}-\d{2}$/`, store it explicitly
in post metadata or content, use it for the title, and always return the same
Karachi `YYYY-MM-DD` format.

**Implemented result:** Manual quiz-date input was removed because the product
does not use scheduled quiz dates. The server calculates the current
`Asia/Karachi` date when saving and uses it for the WordPress title and API
response. The homepage uses the same shared helper. A protected Vercel cron
invalidates `/` daily at `19:00 UTC` (midnight Karachi), preserving ISR while
allowing the next request to regenerate the new date.

### BF-06: Quiz HTML is built from unescaped admin input

**Severity:** High

**Status:** Resolved on June 14, 2026.

**File:** `app/api/quiz/route.js`

**Problem:** Questions, options, and answers are concatenated directly into
HTML.

**Impact:** An authorized or compromised admin request can store arbitrary HTML
or scripts in WordPress content. That content is later rendered with
`dangerouslySetInnerHTML`.

**Fix:** HTML-escape all text fields before creating table markup. Validate
maximum lengths and ensure the answer equals one of the four options.

**Implemented result:** The quiz API trims and validates every question,
option, and answer before writing. It requires exactly five questions, four
non-empty options per question, a matching answer, question text up to 300
characters, and options up to 150 characters. All stored values are HTML
escaped before WordPress table markup is generated.

## 3. Medium-Priority Issues

### BF-07: Category revalidation targets a route that does not exist

**Severity:** Medium

**Status:** Resolved on June 14, 2026.

**File:** `app/api/revalidate/route.js`

For `type === 'category'`, the code revalidates `/category/${slug}`. The actual
route is `/${slug}`.

**Fix:** Change it to `revalidatePath(\`/${slug}\`)`.

**Implemented result:** Category revalidation now targets the actual
root-level category route, such as `/tech`, instead of the nonexistent
`/category/tech` route.

### BF-08: Archive totals are wrong after filtering `daily-quiz`

**Severity:** Medium

**Status:** Resolved on June 14, 2026.

**File:** `lib/wordpress.js`

`getPosts` and `searchPosts` remove `daily-quiz` after WordPress returns the
page. WordPress response headers still include that post in `total` and
`totalPages`.

This can also produce a short page because a request for 10 results may become
9 after filtering.

**Fix:** Exclude the quiz at the API/query level. Resolve its post ID and use
WordPress's `exclude` parameter, or put it in a dedicated post type/status that
does not appear in article queries.

**Implemented result:** Excluded slugs are resolved to WordPress post IDs
before archive and search requests. Those IDs are sent through WordPress's
native `exclude` parameter, so posts, `X-WP-Total`, and
`X-WP-TotalPages` are calculated from the same result set.

### BF-09: Latest lists can return fewer items than requested

**Severity:** Medium

**Status:** Resolved on June 14, 2026.

**File:** `lib/wordpress.js`

`getLatestPosts(count)` requests exactly `count`, then removes `daily-quiz`.
When the quiz is in that result, callers receive `count - 1`.

**Fix:** Exclude by ID in WordPress or request extra records and slice after
filtering.

**Implemented result:** Latest and most-commented queries now exclude the
`daily-quiz` post by WordPress ID before applying `per_page`, so callers receive
the requested number of normal posts when enough posts exist.

### BF-10: Sidebar performs duplicate WordPress requests

**Severity:** Medium

**Status:** Resolved on June 14, 2026.

**Files:** `components/layout/Sidebar.jsx`, `components/widgets/*.jsx`

The sidebar fetches categories, recent posts, and popular posts. It passes them
to widgets, but the widget function signatures ignore those props and fetch
again.

**Impact:** Additional WordPress traffic and slower server rendering, partly
hidden by Next fetch deduplication/caching.

**Fix:** Choose one ownership model:

- Preferred: fetch once in `Sidebar` and make all three widgets presentational.
- Alternative: remove the parent fetches and let widgets own their requests.

**Implemented result:** `Sidebar` now performs the three WordPress requests
once in parallel and passes the results to presentational category, recent,
and popular widgets. The widgets no longer import or call WordPress helpers,
and duplicate widget headings were removed.

### BF-11: Popular-post query is not actually sorted by popularity

**Severity:** Medium

**Status:** Resolved on June 14, 2026.

**Files:** `components/widgets/PopularPosts.jsx`, `lib/wordpress.js`

`PopularPosts` passes `orderby: 'comment_count'`, but `getPosts` does not accept
or append `orderby` or `order`. It returns default WordPress ordering.

`Sidebar` already calls the correctly implemented `getMostCommentedPosts`, but
that result is ignored due to BF-10.

**Fix:** Pass the sidebar result into a presentational widget, or add validated
`orderby` and `order` options to `getPosts`.

**Implemented result:** `Sidebar` passes the result of
`getMostCommentedPosts()` directly to the presentational `PopularPosts`
widget. Because WordPress REST does not support `orderby=comment_count`, the
helper now ranks posts by activity in the latest 100 approved comments, fetches
those posts with supported `orderby=include`, and fills any remaining slots
with latest posts.

### BF-12: Post route accepts an incorrect category prefix

**Severity:** Medium

**Status:** Resolved on June 14, 2026.

**File:** `app/[slug]/[post_slug]/page.jsx`

The post is fetched only by `post_slug`; `slug` is never checked against its
real category. Therefore many URLs can render the same post with different
canonicals and breadcrumbs.

**Impact:** Duplicate content, incorrect canonical URLs, and misleading
navigation.

**Fix:** Determine the canonical category from the post. If the supplied slug
does not match, permanently redirect to the canonical URL or return not found.

**Implemented result:** Post metadata, share URLs, and breadcrumbs now use the
post's primary WordPress category. Requests with another prefix receive a
permanent redirect to `/<primary-category>/<post-slug>`, preventing duplicate
rendered URLs.

### BF-13: `AdBanner` position props do not select ad slots

**Severity:** Medium

**Status:** Resolved on June 15, 2026.

**Files:** route files, `components/ads/AdBanner.jsx`

Routes pass values such as `position="mid"` and `position="bottom"`, but
`AdBanner` has no `position` parameter. Every banner uses
`TOP_LEADERBOARD`.

**Fix:** Either pass explicit `slot={AD_SLOTS...}` everywhere or add a
position-to-slot map inside `AdBanner`.

**Implemented result:** `AdBanner` maps supported position names to
environment-backed slots and renders only when publisher and slot values are
valid.

### BF-14: AdSense script loads even with placeholder configuration

**Severity:** Medium

**Status:** Resolved on June 15, 2026.

**Files:** `app/layout.jsx`, `lib/constants.js`

Ad units correctly return `null` when the client ID contains `XXXX`, but the
global AdSense script is still requested with the invalid placeholder ID.

**Fix:** Render the `<Script>` only when a real AdSense client ID is configured.
Prefer an environment variable for deployment-specific IDs.

**Implemented result:** Placeholder publisher IDs and slots render neither the
global script nor empty ad containers.

### BF-15: The configured Merriweather font is not mapped to Tailwind classes

**Severity:** Medium

**Status:** Resolved on June 15, 2026.

**Files:** `app/layout.jsx`, `tailwind.config.js`, multiple components

The layout creates `--font-merriweather`, and components use
`font-merriweather`, but Tailwind defines only `font-heading` and `font-body`,
both using Inter. There is no `merriweather` font-family key.

**Fix:** Add:

```js
fontFamily: {
  heading: ['var(--font-merriweather)', 'serif'],
  merriweather: ['var(--font-merriweather)', 'serif'],
  body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
}
```

Then decide whether headings should consistently use `font-heading` or
`font-merriweather`.

**Implemented result:** The unused Merriweather download and utility classes
were removed. Inter is now the single application font.

### BF-16: Nested `<main>` elements and duplicate `id="main"`

**Severity:** Medium

**Status:** Resolved on June 14, 2026.

**Files:** `app/layout.jsx`, `app/page.jsx`

The root layout renders `<main id="main">`, and the homepage renders another
`<main id="main">`.

**Impact:** Invalid landmark structure and duplicate IDs for accessibility.

**Fix:** Make the homepage wrapper a `<div>` or `<section>` and keep one main
landmark in the root layout.

**Implemented result:** The homepage now uses a neutral `<div>` wrapper.
`app/layout.jsx` remains the single `<main id="main">` landmark for all routes.

## 4. Low-Priority and Maintainability Issues

### BF-17: ESLint is not configured

**Status:** Resolved on June 15, 2026.

`npm run lint` opens an interactive setup prompt, so CI cannot lint the code.
Next.js also warns that `next lint` is deprecated.

**Fix:** Install/configure ESLint and `eslint-config-next`, add an
`eslint.config.mjs`, and change the script to `eslint .`.

**Implemented result:** ESLint 9 and `eslint-config-next` are installed. The
flat configuration extends Next.js Core Web Vitals rules, and `npm run lint`
runs non-interactively with no warnings or errors.

### BF-18: No automated tests

**Status:** Resolved for the current critical surface on June 15, 2026.

Add focused tests for:

- Quiz HTML formatting and parsing.
- Homepage quiz-post selection.
- Search pagination URL generation.
- Sitemap URL generation.
- Category/post canonical redirects.
- API authentication and payload validation.
- Karachi date boundaries.

**Implemented result:** `npm run test` executes 13 tests through `tsx` and
Node's native test runner. Coverage includes quiz normalization and escaping,
canonical and pagination behavior, archive validation, Karachi midnight, and
WordPress missing-versus-unavailable behavior and body-image enhancement.

### BF-19: API failures are silently swallowed

**Status:** Resolved on June 14, 2026.

Most helpers in `lib/wordpress.js` catch every error and return empty data.
Users see empty content while operators receive no useful signal.

**Fix:** Log structured server-side errors with endpoint and status details,
while continuing to return safe fallback data where appropriate.

**Implemented result:** WordPress requests now retry once after network
failures, HTTP `429`, HTTP `5xx`, or invalid JSON. If the retry fails, the
helper logs structured request context and throws `WordPressApiError`.
Successful slug requests that return an empty array still return `null`, so
routes use the normal 404 page only for confirmed missing content. Temporary
CMS failures render the new `app/error.jsx` or `app/global-error.jsx`
"Temporarily unavailable" screen with a Try Again action.

### BF-20: Quiz parser logs content during every production build/render

**Status:** Resolved on June 14, 2026.

**File:** `lib/quizParser.js`

The parser logs HTML length, table text, questions, options, and answers. Build
output confirmed these logs execute during prerendering.

**Fix:** Remove the logs or guard them behind a server-only debug environment
flag.

**Implemented result:** All quiz parser debug output was removed. Parsing
behavior is unchanged, but quiz tables, questions, options, and answers are no
longer written to production build or render logs.

### BF-21: Duplicate search implementations and unused hook

**Status:** Resolved on June 14, 2026.

`Header`, `SearchWidget`, and `hooks/useSearch.js` contain overlapping search
logic, but the hook is unused.

**Fix:** Reuse the hook in client search forms or remove it.

**Implemented result:** `Header` and `SearchWidget` now both use
`hooks/useSearch.js` for query state, trimming, encoding, and navigation. The
hook supports an optional callback and clearing behavior so the header still
closes and resets after a successful search.

### BF-22: TOC slug generation can create empty or invalid duplicate IDs

**Status:** Resolved on June 14, 2026.

**File:** `lib/toc.js`

Headings containing only non-ASCII characters can normalize to an empty ID.
Existing duplicate IDs are not corrected.

**Fix:** Use a robust slug library or fallback such as `section-1`, track all
generated and existing IDs, and HTML-escape the injected ID.

**Implemented result:** TOC IDs are normalized to safe ASCII slugs, empty
results receive `section-N` fallbacks, and all generated or existing IDs are
tracked in one set. Duplicates receive stable numeric suffixes such as `-2`,
and existing invalid/duplicate `id` attributes are replaced.

### BF-23: `GET /api/revalidate` puts a secret in the URL

**Status:** Resolved on June 14, 2026.

Query-string secrets can appear in browser history, analytics, proxy logs, and
referrer data.

**Fix:** Remove the GET handler in production and use only authenticated POST
requests with the secret in a header.

**Implemented result:** The GET handler was removed. Revalidation is now
available only through `POST /api/revalidate` with
`x-revalidate-secret: REVALIDATE_SECRET`.

### BF-24: Quiz API configuration has two WordPress URL sources

**Status:** Resolved on June 14, 2026.

Public reads use the hardcoded `SITE_CONFIG.wpApiUrl`; quiz writes use
`NEXT_PUBLIC_WORDPRESS_API_URL`.

**Impact:** A configuration mismatch can read from one WordPress installation
and write to another.

**Fix:** Use one validated server configuration source. A write credential/API
URL should not need the `NEXT_PUBLIC_` prefix.

**Implemented result:** Public reads, sitemap generation, and quiz writes now
use `lib/wordpressConfig.js`. It prefers the server-only `WORDPRESS_API_URL`,
supports the existing public variable for backward compatibility, and falls
back to the configured site URL.

### BF-25: Legacy files and dead code increase confusion

**Status:** Resolved on June 14, 2026.

Currently unused:

- `data/quiz.json`
- `CategoryMenu`
- `PostContent`
- `CSSPreloader`
- `ErrorBoundary`
- `useSearch`
- `getComments`

**Fix:** Remove them after confirming they are not planned, or document their
future purpose and add usage tests.

**Implemented result:** Removed `data/quiz.json`, `CategoryMenu`,
`PostContent`, `CSSPreloader`, `ErrorBoundary`, and the unused `getComments`
helper. `useSearch` was retained because it is now used by both search forms.

### BF-26: `PostContent` does not place the React ad at its marker

**Status:** Resolved on June 14, 2026.

The unused component injects an empty HTML ad placeholder, then renders the
actual React ad after the entire HTML block rather than replacing the marker.

**Fix:** Delete the component if obsolete, or split content on a marker as the
active post routes already do.

**Implemented result:** The unused flawed `PostContent` component was deleted.
Active post routes already split content at the marker and render
`AdInArticle` in the correct position.

### BF-27: Admin input validation is incomplete

**Status:** Resolved on June 14, 2026.

The client checks question and answer text but not empty options. The API checks
only that four options exist, not that each is non-empty or that the answer is
one of them.

**Fix:** Trim and validate every option, reject duplicates if undesired, and
require exact answer membership.

**Implemented result:** The API trims all fields, rejects empty or oversized
options, and requires the answer to match one of the four normalized options.

### BF-28: Date/time presentation is inconsistent

**Status:** Resolved on June 14, 2026.

The homepage formats `new Date()` without the explicit Karachi timezone, while
admin helpers attempt Karachi time and the API returns UTC-derived dates.

**Fix:** Centralize date functions and always specify `Asia/Karachi` for daily
quiz dates.

**Implemented result:** Quiz date formatting is centralized in `lib/date.js`.

### BF-29: Admin quiz lookup confuses an outage with a missing post

**Severity:** High

**Status:** Resolved on June 14, 2026.

**File:** `app/api/quiz/route.js`

The old lookup caught every WordPress error and returned `null`. Save logic
treated `null` as "the post does not exist" and switched from `PUT` to `POST`.
A temporary outage could therefore trigger an unsafe create attempt.

**Implemented result:** The lookup now returns `null` only after WordPress
successfully returns an empty array. Network failures, HTTP `429`, HTTP `5xx`,
invalid JSON, and invalid response shapes retry once. Repeated failures stop
the read or save with HTTP `503`; the admin UI displays the error and no create
request is attempted.

### BF-30: Article author is missing after the content

**Severity:** Low

**Status:** Resolved on June 14, 2026.

**Files:** `components/posts/AuthorBox.jsx`,
`app/[slug]/[post_slug]/page.jsx`

The author appeared only in the compact metadata row above the article.

**Implemented result:** Article pages now render an end-of-content author box
with the embedded WordPress author name, optional description, and avatar. An
initial is used when no avatar is available. The box is omitted when the post
does not contain embedded author data.

### BF-31: Publication dates appear on surfaces where they should be hidden

**Severity:** Low

**Status:** Resolved on June 14, 2026.

**Files:** `components/posts/PostMeta.jsx`, `components/posts/PostCard.jsx`,
`components/posts/PostGrid.jsx`, `components/home/LatestNewsGrid.jsx`, and
article/archive routes.

**Implemented result:** `showDate` is now configurable through post metadata,
cards, and grids. Visible publication dates are hidden on individual articles,
related cards, `/blog`, category archives, and homepage Latest News cards.
Search and tag archives retain their existing date display. Article published
and modified dates remain in Open Graph and JSON-LD metadata.

### BF-32: Article breadcrumbs truncate the title too early

**Severity:** Low

**Status:** Resolved on June 14, 2026.

**File:** `components/navigation/Breadcrumbs.jsx`

The final breadcrumb title was limited to `200px`, producing examples such as
`Qualcomm Targets 2029 for 6G Gl...`.

**Implemented result:** The final breadcrumb now allows up to `70vw` on very
small screens, `420px` on small screens, and `560px` on large screens before
truncation.

### BF-33: Sidebar card content and spacing need cleanup

**Severity:** Low

**Status:** Resolved on June 14, 2026.

**Files:** `components/layout/Sidebar.jsx`, `styles/globals.css`

**Implemented result:** The Search and advertisement cards are currently not
rendered. The active Recent Posts, Popular Posts, and Categories cards use one
explicit `24px` parent gap, and the old per-widget bottom margin was removed.

## 5. Open Improvements

### IMP-01: Quiz parser requires a trailing question mark

**Priority:** High

**Status:** Open and required.

`lib/quizParser.js` currently captures question text with a pattern ending in
`\?`. Admin validation allows a question without a question mark, so valid
saved input can parse into an empty question.

**Recommendation:** Parse question text until the first option or answer
marker instead of requiring punctuation.

### IMP-02: Empty or malformed quiz content has no visible fallback

**Priority:** High

**Status:** Open and required.

`QuizAnswerCards` returns `null` when parsing produces no questions. The page
can display a quiz heading followed by empty space.

**Recommendation:** Render a temporary-unavailable message and log malformed
quiz content server-side.

### IMP-03: Ad banner position values do not select slots

**Status:** Resolved on June 15, 2026.

`AdBanner` now maps `top`, `mid`, `bottom`, and `after-content` positions to
validated slots. Slot values can be configured through public environment
variables.

### IMP-04: Placeholder AdSense configuration still loads the script

**Status:** Resolved on June 15, 2026.

The client ID now reads `NEXT_PUBLIC_ADSENSE_ID`. Placeholder clients and
slots render neither the global script nor empty ad containers. Configured ad
containers reserve height to reduce layout shift.

### IMP-05: Font configuration is inconsistent

**Status:** Resolved on June 15, 2026.

The project standardizes on Inter for headings and body text. The unused
Merriweather download and stale utility classes were removed.

### IMP-06: Tooling and regression coverage

**Status:** Resolved for the current critical surface on June 15, 2026.

This combines unresolved BF-17 and BF-18:

- Add non-interactive ESLint configuration.
- Add tests for quiz selection and parsing.
- Add tests for admin lookup outage behavior.
- Add tests for sitemap and pagination URLs.
- Add tests around Karachi midnight.
- Add browser checks for author, breadcrumb, date visibility, and sidebar UI.

ESLint and focused automated tests are now implemented. Additional
browser-level regression coverage remains optional expansion rather than a
blocker.

### IMP-07: Small cleanup

**Status:** Optional cleanup.

- Correct stale comments in `lib/quizParser.js`.

## 6. Change Summary

Completed during the June 14, 2026 fixing pass:

- Explicit `daily-quiz` homepage selection and cache tagging.
- Split sitemap structure and correct canonical URLs.
- Search pagination query preservation.
- Signed admin sessions and protected quiz writes.
- Dynamic Karachi date with midnight revalidation.
- Quiz escaping, validation, and safer WordPress outage handling.
- Correct archive totals, latest counts, category revalidation, and post
  canonical redirects.
- Shared sidebar data fetching and supported popular-post ranking.
- Structured WordPress failures and temporary-unavailable pages.
- Shared search hook, robust TOC IDs, POST-only revalidation, shared WordPress
  URL configuration, and dead-code removal.
- End-of-content author profile.
- Hidden visible publication dates on requested content surfaces.
- Wider article breadcrumbs, simplified sidebar content, and consistent
  sidebar card spacing.

Completed during the June 15, 2026 complex SEO pass:

- Shared plain-text sanitization for metadata and JSON-LD.
- Complete Organization, WebSite, Article, breadcrumb, and Person schema.
- Crawlable author profile routes and author sitemap entries.
- Resilient all-or-nothing sitemap collection with improved image discovery.
- Lean WordPress REST field/embed selection and cheaper popular-post refresh.
- Suspense-streamed footer posts instead of blocking the root layout.
- Removed duplicate Latest News image preloading.
- Lazy/async WordPress body-image attributes.

Completed during the June 15, 2026 performance pass:

- Zero-hydration global header navigation using native HTML controls.
- Removed global pathname/scroll listeners and router-backed header search.
- Removed the unused Merriweather font family.
- Added validated environment-backed ad slots and stable ad dimensions.
- Removed blank ad spacing while AdSense is not configured.
- Added AVIF/WebP image negotiation and a one-day optimized-image cache.
- Selected smaller WordPress media variants for news and sidebar cards.
- Added accurate responsive `sizes` for post-card images.
- Deferred below-fold informational rendering with `content-visibility`.
- Reduced homepage/blog/tag route JavaScript from about `1.03 kB` to
  `634-637 B`, and article route JavaScript from `2.96 kB` to `2.57 kB`.

## 7. Recommended Fix Order

1. IMP-01: accept valid quiz questions without trailing punctuation.
2. IMP-02: prevent an empty quiz section when WordPress content is malformed.
3. Verify live category/article routing and production parity after deployment.

IMP-07 is optional cleanup and is not required for correctness.

## 8. Definition of Done

A bug-fixing pass should not be considered complete until:

- The build passes.
- ESLint runs non-interactively with no errors.
- Focused automated tests pass.
- Homepage quiz selection survives publishing a newer normal post.
- Search pagination retains its query.
- Sitemap URLs all resolve successfully.
- Wrong category/post prefixes redirect or return 404.
- Admin authentication is server validated.
- Quiz dates round-trip in Karachi `YYYY-MM-DD` format.
- Empty/malicious quiz fields are rejected or escaped.
- WordPress request counts for the sidebar are no longer duplicated.
- WordPress outages cannot trigger creation of a second quiz post.
- Quiz questions without a trailing `?` parse correctly.
- Missing or malformed quiz content displays a visible fallback.
- Requested date-hidden surfaces contain no visible publication date.
