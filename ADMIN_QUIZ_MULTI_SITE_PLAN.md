# Admin Quiz Multi-Site Project

## Purpose

This project is being converted into a standalone quiz administration app.
The goal is to update the same daily quiz on multiple websites from one
admin screen instead of editing each website one by one every night.

The app will not be a public content website. It will be an internal admin
tool whose main job is:

1. Let the admin log in securely.
2. Enter or edit the daily 5-question quiz.
3. Validate the quiz before publishing.
4. Submit the same quiz to each configured WordPress website.
5. Revalidate each public website cache when configured.
6. Show which websites updated successfully and which ones failed.

## What This Website Will Do

The app uses `/` as the admin login and quiz editor.

When the admin submits the quiz:

- The app validates exactly 5 questions.
- Each question must have exactly 4 non-empty options.
- Each question must have one correct answer selected.
- The answer must match one of the four options.
- The quiz is converted to the existing WordPress HTML table format.
- The app updates or creates the `daily-quiz` post on each configured
  WordPress website.
- If revalidation is configured for that website, the app calls its
  revalidate endpoint after the WordPress save succeeds.
- After a revalidate request is accepted, the app requests the public page once
  to warm the regenerated route before the admin checks the site.
- The admin sees a per-site result after saving.

This app will not show blog posts, article pages, categories, tags, search,
ads, public SEO pages, public sitemaps, or a public homepage.

## Current Problem

There are multiple websites that use the same daily quiz. Today, the quiz is
updated manually on each website. That creates repeated work and increases
the chance that one website is missed or receives a different quiz by mistake.

The new admin app solves this by becoming one central quiz publishing panel.

## Main Decisions

### 1. Root Page Is The Admin Panel

Decision: `/` will be the admin login and quiz editor.

Reason:

- This is a new admin-only project.
- There is no need for a public homepage.
- The shortest, clearest admin URL is the root route.

The old `/admin/quiz` route will be removed completely after the admin UI is
moved to `/`.

### 2. Remove Public Website Functionality

Decision: remove all public website features that are not required by the
admin quiz flow.

Remove:

- Blog routes.
- Article routes.
- Category and tag routes.
- Search pages.
- Public contact/about/editorial pages.
- Sitemap routes.
- Public robots/SEO behavior.
- AdSense components and scripts.
- Public header, footer, sidebar, post cards, and homepage sections.

Reason:

- The admin app should be small and easy to maintain.
- Public SEO/content code is unrelated to multi-site quiz publishing.
- Fewer routes and components reduce build complexity and future bugs.

### 3. Keep Only Admin And Quiz Helpers

Decision: keep only the helpers needed for the quiz admin system.

Keep:

- Admin authentication and session helpers.
- Karachi date helpers.
- Quiz validation helpers.
- Quiz HTML formatting helpers.
- Quiz HTML parsing helpers.
- WordPress target update helpers.

Reason:

- These are the core pieces needed for login, editing, loading the existing
  quiz, and publishing the quiz to WordPress.
- Keeping these helpers separate makes the app easier to test and reuse.

### 4. Use Numbered Environment Variables For Websites

Decision: configure target websites with numbered environment variables.

Example:

```env
ADMIN_SECRET=

QUIZ_SITE_1_LABEL=
QUIZ_SITE_1_WORDPRESS_API_URL=
QUIZ_SITE_1_WP_ADMIN_USER=
QUIZ_SITE_1_WP_ADMIN_PASS=
QUIZ_SITE_1_REVALIDATE_URL=
QUIZ_SITE_1_REVALIDATE_SECRET=
QUIZ_SITE_1_REVALIDATE_PATH=
QUIZ_SITE_1_REVALIDATE_PATHS=
QUIZ_SITE_1_REVALIDATE_TYPE=

QUIZ_SITE_2_LABEL=
QUIZ_SITE_2_WORDPRESS_API_URL=
QUIZ_SITE_2_WP_ADMIN_USER=
QUIZ_SITE_2_WP_ADMIN_PASS=
QUIZ_SITE_2_REVALIDATE_URL=
QUIZ_SITE_2_REVALIDATE_SECRET=
QUIZ_SITE_2_REVALIDATE_PATH=
QUIZ_SITE_2_REVALIDATE_PATHS=
QUIZ_SITE_2_REVALIDATE_TYPE=
```

Reason:

- It is easy to understand.
- It avoids mixing credentials from different websites.
- It can scale later by adding `QUIZ_SITE_3_*`, `QUIZ_SITE_4_*`, and so on.
- It keeps secrets in environment variables instead of source code.

Important: real `.env.local` values must not be committed or printed in docs.

### 5. WordPress REST API Is The Publishing Target

Decision: each website will be updated through its WordPress REST API.

For every configured target, the app will:

1. Read the WordPress API URL.
2. Authenticate with the site's WordPress admin user and application password.
3. Look for the `daily-quiz` post.
4. Update it if it exists.
5. Create it if it does not exist.
6. Call the site's revalidate endpoint if `QUIZ_SITE_N_REVALIDATE_URL` and
   `QUIZ_SITE_N_REVALIDATE_SECRET` are configured.

Revalidate body behavior:

- If `QUIZ_SITE_N_REVALIDATE_TYPE` is set, send `{ "type": "..." }`.
- For both current public websites, use `QUIZ_SITE_N_REVALIDATE_TYPE=quiz` so
  the body is `{ "type": "quiz" }`.
- If `QUIZ_SITE_N_REVALIDATE_PATH` is set, send `{ "path": "..." }`.
- If `QUIZ_SITE_N_REVALIDATE_PATH` is empty, send `{}` for homepage-only
  revalidation.
- If `QUIZ_SITE_N_REVALIDATE_PATHS` is set as comma-separated paths without
  `REVALIDATE_TYPE`, send one path-based revalidate request for each path.
- If `REVALIDATE_TYPE` is set, `REVALIDATE_PATHS` is used only for public page
  warm-up after the revalidate request is accepted.
- After each accepted request, fetch the public URL for that path once to warm
  the cache. If warm-up fails, show a warning instead of claiming the visible
  page is fully refreshed.

Reason:

- The existing websites already use WordPress.
- The current quiz format already works with the public websites.
- No new database is needed for the admin app.

### 6. Site 1 Is The Edit Source

Decision: `GET /api/quiz` will load the current quiz from site 1.

Reason:

- The editor needs one source to prefill the form.
- Site 1 acts as the primary source for reading.
- Saving still updates every configured site.

### 7. Partial Success Reporting

Decision: if one website updates and another fails, the admin should see a
partial success report.

Reason:

- External WordPress websites cannot be rolled back reliably after one update
  succeeds.
- It is more useful to know exactly which site failed.
- The admin can retry after fixing the failed target.

The save screen should show results like:

- Site 1: updated successfully and revalidated.
- Site 2: failed because WordPress was unavailable.

If WordPress saves but revalidation fails, that site is still shown as saved,
with a cache revalidate warning so the admin knows the public site may still
show cached content.

## Implementation Status

The project has been reduced to the admin functionality described here. The
public website routes, content components, SEO helpers, ad components, public
assets, old scripts, and old public-site documentation have been removed.

Remaining app surface:

- `/` for the admin login and quiz editor.
- `/api/admin/session` for login, logout, and session checks.
- `/api/quiz` for loading the source quiz and publishing to all configured
  WordPress websites.
- Optional per-site revalidate calls after successful WordPress saves.
- Public page warm-up requests after accepted revalidate calls.
- `/robots.txt` to disallow crawling of the private admin app.
- Not-found and error screens for admin-only fallback states.

## Implementation Steps Reference

### Step 1: Simplify Routes

- Move the existing admin quiz page to `app/page.jsx`.
- Remove `app/admin/quiz`.
- Remove `app/admin/layout.jsx` if it is no longer needed.
- Remove public route files that belong to the old content website.
- Keep API routes required for admin login and quiz publishing.

### Step 2: Simplify Layout

- Remove public header and footer from the root layout.
- Remove public SEO metadata, Google Analytics, and AdSense scripts.
- Set admin-friendly metadata.
- Keep noindex behavior because this is not a public website.

### Step 3: Create Multi-Site WordPress Config

- Add a helper that reads numbered `QUIZ_SITE_*` environment variables.
- Validate that each configured target has API URL, user, and password.
- Validate that optional revalidate URL and secret are provided together.
- Ignore empty target slots.
- Return a clear error if no complete target is configured.

### Step 4: Refactor Quiz API

- Keep `/api/admin/session` for login/logout/session checks.
- Keep `/api/quiz` for loading and saving quiz data.
- Change `/api/quiz` so `POST` saves to all configured WordPress targets.
- Return per-site status in the API response.
- Return per-site revalidate status when configured.
- Keep secrets server-side only.

### Step 5: Update Admin UI

- Show the admin form at `/`.
- On save, display per-site publish results.
- Keep validation messages clear and human-readable.
- Keep loading, saving, login, logout, and expired-session states.

### Step 6: Remove Unneeded Files

Remove public-only files after the root admin flow is working, including old
content components, ad components, public SEO helpers, sitemap helpers, and
tests that only apply to the removed public website.

### Step 7: Verify

Run:

```bash
npm run lint
npm run test
npm run build
```

Also manually verify:

- `/` shows the admin login.
- Successful login opens the quiz editor.
- Existing quiz loads from site 1.
- Saving updates both configured websites.
- Failed target results are shown clearly.
- `/admin/quiz` no longer exists.
- Old public routes no longer exist.

## Maintainability Rules

- Keep WordPress publishing logic in a dedicated helper, not inside the React
  page.
- Keep quiz validation and formatting in dedicated quiz helpers.
- Keep target configuration in one server-only module.
- Do not duplicate WordPress update code per website.
- Do not hardcode website credentials in source files.
- Do not expose secrets in browser responses.
- Add tests around validation, target config parsing, and multi-site result
  handling.
- Keep the admin app small; do not reintroduce public content features unless
  there is a clear admin need.

## Final Expected Structure

The app should end up with a small structure focused on admin publishing:

```text
app/
  page.jsx
  layout.jsx
  api/
    admin/session/route.js
    quiz/route.js

lib/
  adminAuth.js
  date.js
  quiz.js
  quizParser.js
  quizTargets.js
  wordpressQuiz.js

styles/
  globals.css

test/
  quiz.test.js
  quizTargets.test.js
  wordpressQuiz.test.js
```

The exact file names can change during implementation, but the responsibility
split should stay the same.
