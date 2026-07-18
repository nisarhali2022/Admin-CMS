# Public Website Migration Baseline

This document records the verification baseline for moving a public website from WordPress REST reads to Supabase public RPCs.

## Required staging inventory

Before activating a website, capture its production URL, status code, redirect chain, title, meta description, canonical URL, robots directive, visible content, image URLs, and Open Graph image for:

- home, fixed pages, and custom pages;
- blog, category, author, and search archives;
- representative posts;
- robots, sitemap, ads.txt, and redirect routes.

Also record WordPress post, page, category, author, media, and historical tag URL counts. Store the completed website-specific comparison in the deployment handoff rather than this reusable guide.

## Rollback

Keep the prior WordPress-backed production deployment available until staging comparison, revalidation checks, and the production smoke test have passed. Rollback is a deployment rollback; do not add a runtime WordPress fallback.
