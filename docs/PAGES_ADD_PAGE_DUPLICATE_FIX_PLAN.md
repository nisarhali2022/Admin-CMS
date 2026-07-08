# Pages Add Page Duplicate Fix Plan

## Summary

The Add Page save error happens because the Add Page form can show an empty Slug field while the backend validator treats an empty path as the fixed template default path. If that template/path already exists, Supabase returns:

```text
Template key or path already exists for this website.
```

The fix is to stop submitting blank Add Page titles/slugs and normalize the entered slug before saving.

## Key Changes

- Add Page validation:
  - When the editor is in Add Page mode, require a non-empty page title.
  - Require a non-empty slug.
  - If either field is missing, do not call the API.
  - Show: `Title and Slug are required for a new page.`

- Slug normalization:
  - `about-us` becomes `/about-us`.
  - `/about-us` stays `/about-us`.
  - `/` stays `/`.
  - Full URLs are blocked in the UI before the API request.

- Duplicate handling:
  - Keep backend duplicate protection unchanged.
  - Show a clearer Pages editor message for duplicate errors:
    `A page with this template or slug already exists for this website. Choose a different slug or edit the existing page.`

- Tests and docs:
  - Update static tests for required Add Page title/slug validation.
  - Confirm slug normalization adds a leading `/`.
  - Confirm full URLs are blocked.
  - Confirm duplicate error text is mapped to the clearer editor message.
  - Update `CHANGE_LOG.md` and `MILESTONE_REVIEWS.md` when implemented.

## Validation

Run after implementation:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
git diff --check -- features docs test
```

## Assumptions

- Add Page still uses the current fixed-template backend model.
- Empty visible Add Page fields are allowed on screen, but Title and Slug must be filled before saving.
- No database/API migration is needed.
