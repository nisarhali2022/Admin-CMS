# Detailed SEO Analysis

## 1. Audit Scope

Audit date: June 14, 2026.

This review covers:

- Next.js metadata and canonical generation.
- Live production URL behavior.
- Indexing, robots, and XML sitemaps.
- Heading hierarchy and rendered content.
- Article, breadcrumb, and site structured data.
- Archive pagination and duplicate-content handling.
- Internal links and route consistency.
- Images, Open Graph, Twitter cards, and Core Web Vitals risks.
- Content quality, topical structure, authorship, and trust signals.

The repository and live production site are not currently identical. Findings
are therefore labeled as:

- **Live:** confirmed in the production browser response.
- **Code:** confirmed in the repository.
- **Parity:** caused by a difference between production and this repository.

## 2. Executive Summary

The project has a useful SEO foundation:

- Canonical routes exist for posts and categories.
- Incorrect post category prefixes permanently redirect.
- Search pages are marked `noindex`.
- Sitemaps are split by content type.
- Breadcrumb and article JSON-LD are present.
- WordPress images use `next/image` in application-owned components.
- The homepage explicitly loads `daily-quiz`.
- Article author information is displayed.

However, several issues can prevent correct indexing or weaken search
performance.

### Priority totals

| Priority | Count | Meaning |
| --- | ---: | --- |
| Critical | 3 | Can remove or consolidate important URLs from search |
| High | 8 | Strong indexing, metadata, or page-quality impact |
| Medium | 15 | Material optimization and crawl-quality opportunity |
| Low | 8 | Cleanup and consistency improvements |

## 3. Critical Issues

### SEO-01: Live category and article URLs redirect to `/blog/`

**Source:** Live

The following representative production URLs resolved to `/blog/` during the
audit:

```text
/tech/
/tech/samsung-just-made-6g-networks-possible/
```

The resulting page used:

```text
Title: Blog | Telenor Quiz Today
Canonical: https://telenorquiztoday.com.pk/blog/
```

**Impact:**

- Category and article URLs cannot retain their own rankings.
- Google may remove the original URLs and consolidate signals into `/blog/`.
- Sitemap URLs can disagree with crawler-visible destinations.
- Internal links lead users and crawlers to the wrong page.

**Required fix:**

1. Inspect WordPress redirect plugins, server redirects, Vercel routing, and
   deployment configuration.
2. Remove catch-all redirects that send valid categories/posts to `/blog/`.
3. Confirm each article returns its own content and canonical.
4. Confirm categories return archive content rather than the blog page.
5. Revalidate or resubmit the corrected sitemap in Google Search Console.

**Validation:**

```text
GET /tech/                                      -> 200, canonical /tech/
GET /tech/<valid-post>/                         -> 200, canonical same URL
GET /wrong-category/<valid-post>/               -> 308 to canonical category
```

### SEO-02: Article pages do not render the article title as an `<h1>`

**Source:** Code

`app/[slug]/[post_slug]/page.jsx` renders breadcrumbs, metadata, the featured
image, TOC, and content, but it never renders `post.title.rendered`.

**Impact:**

- The main page topic is absent from the visible document structure.
- The first heading may be an arbitrary WordPress `h2`.
- Accessibility and search-engine content interpretation are weakened.
- Users do not see the article title after opening a card.

**Required fix:** Render one sanitized article title before `PostMeta`:

```jsx
<h1>{stripHtml(post.title.rendered)}</h1>
```

Keep exactly one page-level H1.

### SEO-03: The fallback Open Graph image does not exist

**Source:** Code

`SITE_CONFIG.defaultOgImage` is `/og-default.jpg`, but `public/` contains no
matching file. This URL is used by the root layout, homepage, blog, category,
tag, post, and generic page metadata when no featured image is available.

**Impact:**

- Social previews can show no image or an error.
- Link click-through rate can fall.
- Metadata validators report a broken asset.

**Required fix:** Add a real 1200x630 image at:

```text
public/og-default.jpg
```

Alternatively, change the constant to an existing absolute image URL.

## 4. High-Priority Issues

### SEO-04: Paginated archives canonicalize every page to page 1

**Source:** Code

Blog, category, and tag metadata ignore `searchParams.page`. For example:

```text
/blog?page=2       canonical -> /blog
/tech?page=2       canonical -> /tech
/tag/example?page=2 canonical -> /tag/example
```

**Impact:**

- Older archive pages may be treated as duplicates.
- Posts available only on later pages can receive weaker discovery signals.
- Google may ignore page 2+ content.

**Fix:** Use self-referencing canonicals:

```text
/blog?page=2 -> canonical /blog?page=2
```

Validate the page number and return 404 for values below 1 or above the last
available page.

### SEO-05: Generated titles can repeat the site name

**Source:** Code

The root layout defines:

```js
title: {
  template: `%s | ${SITE_CONFIG.name}`
}
```

Many routes already return titles such as:

```text
Blog | Telenor Quiz Today
Tech Archives | Telenor Quiz Today
Post Title | Telenor Quiz Today
```

The template can produce:

```text
Blog | Telenor Quiz Today | Telenor Quiz Today
```

**Fix:** Route metadata should return only the page-specific portion:

```text
Blog
Tech Archives
Post Title
```

Allow the root template to append the brand once. Preserve complete external
Yoast titles with `title.absolute` when appropriate.

### SEO-06: Generic WordPress pages also omit a visible H1

**Source:** Code

The WordPress-page branch of `app/[slug]/page.jsx` renders `PostMeta`,
featured image, TOC, and content without rendering `page.title.rendered`.

**Impact:** The same heading-hierarchy problem as SEO-02 affects dynamically
resolved WordPress pages.

**Fix:** Render one sanitized H1 before page metadata and content.

### SEO-07: Repository routes conflict with existing WordPress page slugs

**Source:** Code + Live

The repository links to and fetches:

```text
/about   -> WordPress slug "about"
/contact -> WordPress slug "contact"
```

The live site exposes:

```text
/about-us/
/contact-us/
```

The previously supplied page sitemap also used `/contact-us/`.

**Impact:**

- Header/footer links may return 404 after deployment.
- Duplicate versions may exist through the generic `[slug]` route.
- Sitemap, internal links, and canonicals can disagree.

**Fix:** Choose one permanent slug for each page. Recommended:

```text
/about-us/
/contact-us/
```

Update fetch slugs, route links, metadata canonicals, sitemap output, and
redirect old variants permanently.

### SEO-08: Sitemap failures are silently converted into empty/partial maps

**Source:** Code

`lib/sitemap.js` catches fetch failures and breaks pagination without logging
or throwing. Non-OK responses also stop silently.

**Impact:**

- A temporary WordPress failure can publish an incomplete sitemap.
- Search engines can interpret missing URLs as removed content.
- Operators receive no useful alert.

**Fix:** Reuse the structured WordPress retry/error policy. Prefer serving the
last cached complete sitemap over generating an empty or partial one.

### SEO-09: Production and repository metadata/schema are not in parity

**Source:** Parity

The live homepage exposed:

```text
lang="en-US"
Yoast-generated Article schema
WordPress-style metadata
```

The repository would emit:

```text
lang="en"
custom Next.js metadata
no homepage Article schema
```

**Impact:** SEO fixes in the repository may not affect production, and live
behavior cannot be reliably predicted from source review.

**Fix:** Confirm the active production deployment, DNS origin, reverse proxy,
and WordPress/Next.js ownership. Establish one authoritative rendering layer.

### SEO-10: Archive and tag pages can be thin

**Source:** Code

Category pages display a description only when WordPress provides one. Tag
pages display only a heading and post count. The blog page has one generic
sentence.

**Impact:**

- Weak topical context.
- Low differentiation between archives.
- Tag archives can become low-value indexable pages.

**Fix:**

- Add unique category introductions, entities, and internal links.
- Add useful tag descriptions or mark low-value tag archives `noindex`.
- Keep only strategically useful taxonomy pages indexable.

### SEO-11: Article structured data is incomplete and uses unsanitized titles

**Source:** Code

Article JSON-LD currently contains:

- `headline`
- dates
- basic author
- basic publisher

It omits:

- `mainEntityOfPage`
- `image`
- publisher logo
- description
- author URL/profile

`headline` uses raw `post.title.rendered`, which can contain HTML entities or
markup.

**Fix:** Strip HTML and add complete Article fields using canonical URLs,
featured-image data, publisher logo, and author identity.

## 5. Medium-Priority Issues

### SEO-12: Canonical slash style is inconsistent

**Source:** Code

Sitemaps output trailing slashes, while metadata canonicals generally do not.

**Fix:** Choose one URL convention and enforce it through Next.js redirects,
internal links, canonicals, and sitemaps.

### SEO-13: Homepage metadata date and visible H1 can diverge

**Source:** Code

The H1 always contains the current Karachi date. Metadata primarily comes from
the WordPress `daily-quiz` Yoast/title data, which may not update at midnight.

**Impact:** Search snippets and the visible page can present different dates.

**Fix:** Generate the homepage title and description from the same Karachi
date helper, while retaining only stable Yoast fields that do not conflict.

### SEO-14: Homepage sitemap `lastmod` does not reflect midnight date changes

**Source:** Code

The homepage visibly changes its date each midnight, but sitemap `lastmod`
uses the quiz post modification date or a WordPress page modification date.

**Fix:** Either update homepage `lastmod` at the Karachi date rollover or stop
treating the displayed date as a substantive content update. Do not publish a
false modification time.

### SEO-15: Breadcrumb JSON-LD omits the final item URL

**Source:** Code

Only breadcrumb entries with `href` receive an `item` URL. The final current
page has no `item`.

**Fix:** Pass the canonical path for every breadcrumb item, including the
current page, and include the absolute URL in JSON-LD.

### SEO-16: No site-level Organization or WebSite schema in Next.js output

**Source:** Code

The repository emits Article and Breadcrumb schemas, but no central
Organization/WebSite identity graph.

**Fix:** Add stable site-level JSON-LD in the root layout with:

- Organization name and canonical URL.
- Real logo URL and dimensions.
- Real social profiles only.
- WebSite name, URL, and language.

Do not add a SearchAction unless the search URL and behavior are reliable.

### SEO-17: Author identity lacks a crawlable profile URL

**Source:** Code

The author box shows a name, description, and avatar, but there is no author
route or schema URL tying articles to an author entity.

**Fix:** Add author profile pages or a stable author anchor/URL containing bio,
expertise, editorial role, and article list. Reference that URL from Article
schema.

### SEO-18: Open Graph/Twitter metadata is inconsistent by route

**Source:** Code

Some routes define Open Graph but not Twitter fields. Static pages do not
always define images. Dynamic images omit explicit width/height.

**Fix:** Create a shared metadata builder covering:

- canonical
- title/description
- Open Graph URL/type/image dimensions
- Twitter card/title/description/image
- robots policy

### SEO-19: WordPress REST payloads are larger than necessary

**Source:** Code

Many requests use `_embed=true` without `_fields`, returning large post
objects.

**Impact:** Slower server rendering, higher origin load, and weaker TTFB.

**Fix:** Define endpoint-specific `_fields` lists while retaining required
embedded media, terms, and authors.

### SEO-20: Popular-post calculation is expensive

**Source:** Code

The sidebar fetches up to 100 comments and then another posts request. It is
cached for five minutes but still affects origin load and regeneration time.

**Fix:** Precompute popular post IDs, use a WordPress endpoint/plugin designed
for popularity, or refresh the ranking less frequently.

### SEO-21: Root footer data can delay the entire response

**Source:** Code

`Footer` is an async component in the root layout and fetches recent posts.
Unlike the sidebar, it is not wrapped in Suspense.

**Fix:** Wrap the footer data section in Suspense, cache it for longer, or
remove dynamic recent posts from the global layout.

### SEO-22: Homepage image priority is over-specified

**Source:** Code

The header logo uses `priority`. The first Latest News image also uses
`priority`, and `LCPPreloader` injects another preload for that same image.

**Impact:** Competing high-priority resources can reduce LCP performance.

**Fix:** Measure the actual LCP element and use one preload mechanism for that
resource only.

### SEO-23: WordPress body images are not optimized by application code

**Source:** Code

Images inside `dangerouslySetInnerHTML` bypass `next/image`. Their loading,
dimensions, decoding, and responsive sources depend entirely on WordPress
markup.

**Fix:** Ensure WordPress always supplies width, height, `srcset`, and `sizes`.
Post-process non-critical body images with `loading="lazy"` and
`decoding="async"` where safe.

### SEO-24: Image alt text can contain raw WordPress HTML/entities

**Source:** Code

Fallback alt text can use `post.title.rendered` directly. Recent-post image alt
text also uses the rendered title.

**Fix:** Decode entities and strip HTML before assigning alt attributes.

### SEO-25: Invalid archive page numbers do not become clean 404 responses

**Source:** Code

Page numbers are converted with `Number(...)`, but there is no explicit range
validation. WordPress errors for excessive pages can become temporary API
errors rather than a not-found response.

**Fix:** Reject non-integers and values below 1. Return 404 when
`currentPage > totalPages`.

### SEO-26: Social profile links are placeholders

**Source:** Code

Footer links point to generic destinations:

```text
https://facebook.com
https://twitter.com
https://wa.me/
```

**Impact:** Weak trust signals and poor user experience.

**Fix:** Add verified profiles or remove the icons. Use the same verified URLs
in Organization schema.

## 6. Low-Priority Issues

### SEO-27: HTML language should be specific and consistent

**Source:** Code + Live

Repository: `lang="en"`. Live: `lang="en-US"`. Primary audience and locale are
Pakistan.

**Fix:** Use `lang="en-PK"` consistently unless the content language differs.

### SEO-28: Next.js metadata `link` resource hints are not reliable

**Source:** Code

The root metadata object contains a `link` array for Google Fonts. The project
uses `next/font`, which self-hosts fonts, and resource hints should not be
defined through an unsupported metadata field.

**Fix:** Remove those entries. Use Next.js font handling and measure actual
preconnect requirements.

### SEO-29: Placeholder AdSense script is loaded globally

**Source:** Code

The client ID is `ca-pub-XXXXXXXXXXXXXXXXX`, but the layout still renders the
AdSense script URL.

**Fix:** Load the script only when a valid environment-provided publisher ID
exists.

### SEO-30: Sitemap image extraction is incomplete

**Source:** Code

The sitemap parser reads only `<img src>`. It does not account for lazy-image
attributes or additional `srcset` candidates.

**Fix:** Prefer WordPress media data and intentionally select the canonical
image URL rather than scraping HTML only.

### SEO-31: Sitemap does not include tag archives

**Source:** Code

Tag routes are indexable but absent from the sitemap.

**Fix:** Either:

- add only valuable, described tag pages to a tag sitemap, or
- mark all low-value tag archives `noindex`.

Do not indiscriminately index every tag.

### SEO-32: Metadata text can contain rendered HTML or entities

**Source:** Code

Post/page fallback titles sometimes use `.rendered` directly.

**Fix:** Apply a shared plain-text decoder to all fallback titles,
descriptions, alt text, and structured-data names.

### SEO-33: Search pages should explicitly use `follow: true`

**Source:** Code

Search metadata sets only `index: false`.

**Fix:** Use:

```js
robots: { index: false, follow: true }
```

This makes the intended policy explicit.

### SEO-34: Missing editorial trust pages and policies in application links

**Source:** Code + Live

The live site exposes Terms and Disclaimer pages, but repository navigation
does not link them. There is no obvious editorial policy, corrections policy,
or sourcing policy.

**Fix:** Add accessible trust pages and link them from the footer:

- About/editorial team.
- Contact.
- Editorial and corrections policy.
- Sources/methodology for quiz answers.
- Terms, privacy, and disclaimer.

## 7. Content and Topical SEO Analysis

### Homepage

Strengths:

- Daily intent is clear.
- The current date appears in the H1.
- Quiz answers are immediately available.
- Supporting sections cover participation and troubleshooting.

Improvements:

- Rewrite awkward phrases such as “inside the today My Telenor app question
  answer.”
- Reduce repeated exact-match phrases.
- Avoid unsupported claims such as real-time tracking unless the process
  genuinely supports them.
- State when and how answers are verified.
- Add a visible “last checked” time only when it is accurate.
- Link to relevant Telenor package/code guides contextually.

### News Articles

Improvements:

- Add a visible H1.
- Include original reporting, analysis, citations, and named sources.
- Avoid publishing rewritten news with little unique value.
- Add author expertise and editorial review information.
- Use descriptive internal links to related telecom/technology explainers.
- Update material changes and retain accurate `dateModified`.

### Category Pages

Improvements:

- Add 150-300 words of unique, useful category copy.
- Explain the category scope and major subtopics.
- Link to cornerstone guides.
- Avoid category titles that contain only “Archives.”

### Tags

Tags should be curated. Index only tags that:

- Have multiple high-quality posts.
- Have a unique description.
- Represent genuine search intent.
- Are linked internally.

Noindex or remove one-post, duplicate, or near-synonymous tags.

## 8. Recommended Implementation Order

### Phase 1: Indexing protection

1. Fix live category/article redirects to `/blog/`.
2. Confirm production is serving this Next.js repository.
3. Add article and generic-page H1 elements.
4. Add the real fallback OG image.
5. Correct page slug mismatches for About and Contact.
6. Make paginated canonicals self-referencing.

### Phase 2: Metadata and schema

1. Remove duplicate brand suffixes from route titles.
2. Sanitize all metadata and schema text.
3. Expand Article schema.
4. Add Organization and WebSite schema.
5. Standardize Open Graph/Twitter metadata.
6. Standardize trailing-slash policy.

### Phase 3: Crawl and archive quality

1. Make sitemap generation resilient.
2. Validate archive page numbers.
3. Decide which tags should be indexed.
4. Add unique category/tag copy.
5. Align homepage `lastmod` with real content changes.

### Phase 4: Performance and trust

1. Reduce WordPress payloads.
2. simplify popular-post calculation.
3. prevent footer data from blocking the root layout.
4. Measure and correct image preload priorities.
5. Optimize WordPress body images.
6. Add real social links, author profiles, editorial policies, and sourcing
   methodology.

## 9. Validation Checklist

After fixes:

- Every important URL returns its intended content.
- Valid categories and posts do not redirect to `/blog/`.
- Every indexable page has one visible H1.
- Titles contain the site name no more than once.
- Canonicals match the exact preferred URL.
- Page 2+ archives self-canonicalize.
- Invalid pagination returns 404.
- The fallback OG image returns HTTP 200 and is 1200x630.
- Article schema passes Schema.org and Google rich-result validation.
- Breadcrumb schema uses canonical item URLs.
- Sitemap generation survives temporary WordPress failures.
- Sitemaps contain only canonical, indexable, HTTP 200 URLs.
- Search and admin pages are `noindex`.
- Language, Open Graph locale, and visible audience targeting agree.
- Core Web Vitals are measured on homepage, archive, and article templates.
- Search Console coverage, canonical, crawl, and enhancement reports are
  reviewed after deployment.

## 10. Current Verification Limitations

- The current full Next.js build is blocked by a Windows `EPERM` lock on
  `.next/trace`.
- Browser access to XML and robots endpoints was blocked by the local browser
  client, so their repository implementations were reviewed directly.
- No Search Console, Analytics, backlink, keyword, or field Core Web Vitals
  data was available.
- Live production and repository output differ, so deployment parity must be
  resolved before treating source changes as live SEO fixes.
