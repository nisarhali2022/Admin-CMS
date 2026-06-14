# Telenor Quiz Project Structure

## 1. Top-Level Layout

```text
telenor-quiz/
|-- app/                 Next.js routes, layouts, metadata, and API handlers
|-- components/          Reusable server and client UI components
|-- data/                Legacy/local quiz JSON
|-- hooks/               Client-side React hooks
|-- lib/                 WordPress, parsing, TOC, constants, and utility logic
|-- public/              Static public assets (currently empty)
|-- styles/              Global Tailwind/CSS styles
|-- package.json         Scripts and dependencies
|-- next.config.js       Next.js image and response-header configuration
|-- tailwind.config.js   Theme, content scanning, and typography configuration
|-- postcss.config.js    Tailwind and Autoprefixer pipeline
|-- jsconfig.json        `@/*` import alias
|-- .env.local           Local secrets; ignored by Git
```

## 2. Route Map

| URL | File | Data/API calls | Main output |
| --- | --- | --- | --- |
| `/` | `app/page.jsx` | `getPosts`, quiz/FAQ parsers | Daily quiz and latest news |
| `/blog` | `app/blog/page.jsx` | `getPosts` | Paginated all-post archive |
| `/search?q=...` | `app/search/page.jsx` | `searchPosts` | Dynamic search results |
| `/<slug>` | `app/[slug]/page.jsx` | Category API, then page API | Category archive or WP page |
| `/<category>/<post>` | `app/[slug]/[post_slug]/page.jsx` | Post and related-post APIs | Article detail |
| `/tag/<slug>` | `app/tag/[slug]/page.jsx` | Tag and posts APIs | Tag archive |
| `/about` | `app/about/page.jsx` | `getPageBySlug('about')` | About page |
| `/contact` | `app/contact/page.jsx` | `getPageBySlug('contact')` | Contact page |
| `/privacy-policy` | `app/privacy-policy/page.jsx` | WP page API | Privacy policy |
| `/admin/quiz` | `app/admin/quiz/page.jsx` | `GET/POST /api/quiz` | Quiz editor |
| `/api/quiz` | `app/api/quiz/route.js` | WordPress posts API | Read/write daily quiz |
| `/api/revalidate` | `app/api/revalidate/route.js` | Next cache API | On-demand revalidation |
| `/sitemap.xml` | `app/sitemap.js` | Post/category slug APIs | Sitemap |
| `/robots.txt` | `app/robots.js` | None | Crawler rules |
| not found | `app/not-found.jsx` | None | Custom 404 |

`app/layout.jsx` wraps every route with `Header`, `Footer`, global fonts,
global CSS, metadata defaults, and the AdSense script.

## 3. Library Modules

### `lib/constants.js`

Central configuration consumed by the layout, navigation, SEO, WordPress
client, ads, and components.

Exports:

- `SITE_CONFIG`
- `NAV_LINKS`
- `AD_SLOTS`
- `CATEGORY_COLORS`

### `lib/wordpress.js`

The server-side WordPress REST client.

| Function | WordPress endpoint | Used by |
| --- | --- | --- |
| `getPosts` | `/posts` | Home, blog, tag, popular widget |
| `getPostsByCategory` | `/posts?categories=` | `[slug]` category archive |
| `getPostBySlug` | `/posts?slug=` | Post detail |
| `getLatestPosts` | `/posts?orderby=date` | Footer, sidebar/recent widget |
| `getMostCommentedPosts` | `/posts?orderby=comment_count` | Sidebar |
| `getRelatedPosts` | `/posts?categories=&exclude=` | Post detail |
| `getCategories` | `/categories` | Sidebar, menus |
| `getCategoryBySlug` | `/categories?slug=` | `[slug]` |
| `getTagBySlug` | `/tags?slug=` | Tag archive |
| `getPageBySlug` | `/pages?slug=` | Static and dynamic WP pages |
| `searchPosts` | `/posts?search=` | Search route |
| `getComments` | `/comments` | Currently unused |
| `getAllPostSlugs` | paginated `/posts` | Sitemap |
| `getAllCategorySlugs` | `/categories` | Static params and sitemap |

All public CMS calls use Next.js fetch caching. Most use the global one-hour
revalidation value.

### `lib/utils.js`

Presentation helpers for dates, reading time, plain text, excerpts, category
colors, media, authors, categories, and HTML ad-marker insertion.

Main callers: post cards, post pages, metadata functions, widgets, homepage,
footer, and breadcrumbs.

### `lib/quizParser.js`

- `parseQuizTables`: converts WordPress quiz table HTML into question objects.
- `parseFaqs`: extracts `Q:` and `A:` pairs from plain text.
- Karachi date helpers are exported but currently unused.

### `lib/toc.js`

Finds `h1` through `h4` elements in WordPress HTML, creates IDs where needed,
and returns both modified HTML and table-of-contents entries.

### `hooks/useSearch.js`

A reusable search form hook. It is currently unused because `Header` and
`SearchWidget` each implement their own search state and submission logic.

## 4. Component Map

### Layout

| File | Type | Calls/uses |
| --- | --- | --- |
| `components/layout/Header.jsx` | Client | navigation, search router, logo |
| `components/layout/Footer.jsx` | Server | `getLatestPosts`, links, logo |
| `components/layout/Sidebar.jsx` | Server | CMS helpers, widgets, sidebar ad |

### Home

| File | Input | Responsibility |
| --- | --- | --- |
| `QuizAnswerCards.jsx` | parsed questions | Questions, options, correct answers |
| `LatestNewsGrid.jsx` | WordPress posts | Homepage news cards |
| `QuizInfoSections.jsx` | none | Static SEO/information sections |
| `StepsSection.jsx` | none | Participation steps and images |
| `FaqSection.jsx` | parsed FAQs | Parsed or fallback FAQ list |

### Posts

| File | Input | Responsibility |
| --- | --- | --- |
| `PostGrid.jsx` | posts | Two-column card collection |
| `PostCard.jsx` | post | Linked article preview |
| `FeaturedImage.jsx` | post | WordPress image or color fallback |
| `PostMeta.jsx` | post | Category, author, date, reading time |
| `TableOfContents.jsx` | TOC entries | Expandable client TOC |
| `PostContent.jsx` | HTML | Legacy/unused content renderer |

### Widgets

| File | Intended input | Current behavior |
| --- | --- | --- |
| `SearchWidget.jsx` | none | Client search form |
| `CategoryList.jsx` | categories | Ignores passed data and fetches again |
| `RecentPosts.jsx` | posts/count | Ignores passed posts and fetches again |
| `PopularPosts.jsx` | posts/count | Ignores passed posts and fetches again |

### Navigation, Ads, and UI

- `Pagination.jsx`: builds previous, numbered, and next links.
- `CategoryMenu.jsx`: horizontal category cards; currently unused.
- `Breadcrumbs.jsx`: visual breadcrumbs plus JSON-LD.
- `AdSenseUnit.jsx`: client-side AdSense unit.
- `AdBanner.jsx`: horizontal wrapper around `AdSenseUnit`.
- `AdInArticle.jsx`: fluid in-article ad.
- `ShareButtons.jsx`: WhatsApp, Facebook, X, and clipboard sharing.
- `LCPPreloader.jsx`: injects an image preload link; used by the homepage.
- `CSSPreloader.jsx`: unused CSS preload helper.
- `ErrorBoundary.jsx`: unused client error boundary.
- `LoadingSpinner.jsx`: Suspense fallback.

## 5. Detailed Call Flows

### Public page request

```text
Browser
  -> app route
  -> lib/wordpress.js
  -> WordPress REST API
  -> lib transformation helpers
  -> route JSX
  -> shared components
  -> HTML response / cached result
```

### Homepage quiz

```text
app/page.jsx
  -> getPosts({ perPage: 1, tag: "quiz" })
     -> WordPress /posts
     -> "quiz" is a Next cache tag, not a WP tag filter
  -> parseQuizTables(post.content.rendered)
  -> QuizAnswerCards
```

### Article page

```text
app/[slug]/[post_slug]/page.jsx
  -> getPostBySlug(post_slug)
  -> getRelatedPosts(firstCategory.id, post.id)
  -> generateTocAndInjectIds(content)
  -> injectAdAfterFirstParagraph(content, marker)
  -> FeaturedImage + PostMeta + TableOfContents
  -> WordPress HTML + AdInArticle + ShareButtons + related PostCards
```

### Admin quiz update

```text
app/admin/quiz/page.jsx
  -> POST /api/quiz with x-admin-secret
  -> validate five questions and four options each
  -> find WordPress post slug "daily-quiz"
  -> format questions as HTML tables
  -> WordPress POST or PUT using Basic Authentication
  -> revalidateTag("quiz")
  -> homepage quiz fetch becomes stale
```

### Sidebar

Current behavior:

```text
Sidebar
  -> fetch categories, recent posts, most-commented posts
  -> pass values to widgets
  -> widgets ignore those values
  -> widgets fetch categories/recent/posts again
```

This causes duplicate CMS requests and is covered in `BUG_FIXING.md`.

## 6. API Contracts

### `GET /api/quiz`

Response:

```json
{
  "questions": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "answer": "A"
    }
  ],
  "date": "WordPress modified value",
  "id": 123
}
```

This endpoint is public and does not validate `ADMIN_SECRET`.

### `POST /api/quiz`

Required header:

```text
x-admin-secret: ADMIN_SECRET
```

Body:

```json
{
  "date": "2026-06-14",
  "questions": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "answer": "A"
    }
  ]
}
```

Exactly five questions and exactly four options per question are required.

### `POST /api/revalidate`

Required header:

```text
x-revalidate-secret: REVALIDATE_SECRET
```

Optional body:

```json
{
  "slug": "tech",
  "type": "category"
}
```

The homepage is always revalidated.

### `GET /api/revalidate?secret=...`

Convenience endpoint that revalidates only the homepage. Putting a secret in a
URL can leak it through browser history and logs; POST headers are preferred.

## 7. Route and Link Conventions

The UI generally uses:

- Category: `/<category-slug>`
- Post: `/<category-slug>/<post-slug>`
- Tag: `/tag/<tag-slug>`
- WordPress page: `/<page-slug>`

Any code producing `/category/<slug>` or a one-segment post URL is inconsistent
with the implemented routes.

## 8. Unused or Legacy Files

- `data/quiz.json`
- `hooks/useSearch.js`
- `components/navigation/CategoryMenu.jsx`
- `components/posts/PostContent.jsx`
- `components/ui/CSSPreloader.jsx`
- `components/ui/ErrorBoundary.jsx`
- `getComments` in `lib/wordpress.js`

These may be retained for planned work, but they should not be treated as part
of the active runtime flow.
