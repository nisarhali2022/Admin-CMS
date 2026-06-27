# Deployment DNS Checklist

## Goal

Move the public website to Vercel while keeping WordPress on Hostinger as the
backend.

```text
https://telenorquiztoday.com.pk
  -> Vercel / Next.js public site

https://wp.telenorquiztoday.com.pk
  -> Hostinger / WordPress admin and REST API
```

## Current Nameservers

The domain is registered at Domain.pk, but DNS is managed by Hostinger because
the active nameservers are:

```text
ns1.dns-parking.com
ns2.dns-parking.com
```

Therefore DNS changes should be made in:

```text
Hostinger -> Domains -> telenorquiztoday.com.pk -> DNS / Nameservers
```

Do not change nameservers at Domain.pk during this migration.

## Before Changing DNS

Confirm these are complete:

- [ ] Vercel project is deployed successfully.
- [ ] Vercel project has this environment variable:

```text
WORDPRESS_API_URL=https://wp.telenorquiztoday.com.pk/wp-json/wp/v2
```

- [ ] Vercel project has required secrets:

```text
WP_ADMIN_USER
WP_ADMIN_PASS
ADMIN_SECRET
REVALIDATE_SECRET
CRON_SECRET
```

Google Analytics, Search Console verification, and AdSense IDs are currently
defined in `lib/constants.js`. If the project is later changed back to
environment-driven public IDs, add those `NEXT_PUBLIC_*` variables in Vercel
before deployment.

- [ ] Vercel Domains settings includes:

```text
telenorquiztoday.com.pk
www.telenorquiztoday.com.pk
```

- [ ] WordPress backend works:

```text
https://wp.telenorquiztoday.com.pk/wp-admin
https://wp.telenorquiztoday.com.pk/wp-json/wp/v2/posts
```

## Hostinger DNS Changes

In the DNS zone for:

```text
telenorquiztoday.com.pk
```

### 1. Root Domain

Edit the existing `A` record:

```text
Type: A
Name: @
Current value: 212.85.29.19
New value: 76.76.21.21
TTL: 300 or default
```

This points the root domain to Vercel.

### 2. Remove Hostinger IPv6 Root Record

Delete the existing root `AAAA` record:

```text
Type: AAAA
Name: @
Current value: 2a02:4780:1587:...
```

Reason: if this Hostinger IPv6 record remains, some visitors may still reach
Hostinger instead of Vercel.

### 3. WWW Domain

Edit the existing `www` CNAME:

```text
Type: CNAME
Name: www
Current value: telenorquiztoday.com.pk
New value: cname.vercel-dns.com
TTL: 300 or default
```

Use the exact value shown in Vercel if Vercel gives a different value.

## Records Not To Touch

Do not delete or edit email records:

```text
MX
TXT SPF
TXT DMARC
hostinger DKIM CNAME records
autodiscover
autoconfig
```

Do not click:

```text
Reset DNS records
```

## WordPress Backend Safety Check

Make sure the `wp` subdomain still points to Hostinger.

Search the DNS zone for:

```text
wp
```

Expected:

```text
wp.telenorquiztoday.com.pk -> Hostinger
```

Do not delete the `wp` record, WordPress files, or WordPress database.

## WordPress Backend Noindex

The WordPress backend should not be indexed by Google.

In WordPress:

```text
Settings -> Reading -> Discourage search engines from indexing this site
```

Also serve this on:

```text
https://wp.telenorquiztoday.com.pk/robots.txt
```

```txt
User-agent: *
Disallow: /
```

This does not block Vercel from using the REST API.

## After DNS Change

Wait for DNS propagation, then test:

```text
https://telenorquiztoday.com.pk
```

Expected: opens the Vercel Next.js website.

```text
https://www.telenorquiztoday.com.pk
```

Set `telenorquiztoday.com.pk` as the primary domain in Vercel. Keep
`www.telenorquiztoday.com.pk` connected and let Vercel handle any `www` to
non-www redirect. Do not add an app-level host redirect in `next.config.js`;
that previously risked redirect loops when platform/domain redirects also
existed.

Expected: opens or redirects to the Vercel website.

Preferred final SEO URL:

```text
https://telenorquiztoday.com.pk
```

If `www` is connected, it should perform one redirect to the non-www domain.

```text
https://wp.telenorquiztoday.com.pk/wp-admin
```

Expected: opens WordPress admin on Hostinger.

```text
https://wp.telenorquiztoday.com.pk/wp-json/wp/v2/posts
```

Expected: returns WordPress REST API data.

```text
https://telenorquiztoday.com.pk/sitemap_index.xml
```

Expected: returns the Next.js sitemap index.

## Important Rule

Do not remove the domain/site from Hostinger yet.

Only change DNS so:

```text
telenorquiztoday.com.pk -> Vercel
www.telenorquiztoday.com.pk -> Vercel
wp.telenorquiztoday.com.pk -> Hostinger
```

Removing the main domain from Hostinger can break the `wp.` subdomain if
Hostinger also removes the DNS zone, files, database, or subdomain mapping.

## Latest Deployment Verification - 2026-06-20

After DNS and Vercel deployment are complete, verify these URLs:

```text
https://telenorquiztoday.com.pk/
https://www.telenorquiztoday.com.pk/
https://telenorquiztoday.com.pk/ads.txt
https://telenorquiztoday.com.pk/robots.txt
https://telenorquiztoday.com.pk/sitemap_index.xml
https://telenorquiztoday.com.pk/sitemap.xml
https://wp.telenorquiztoday.com.pk/wp-json/wp/v2/posts
```

Expected results:

- Root domain and `www` domain both serve the Vercel Next.js site.
- Non-www is the primary/canonical domain; `www` should redirect once to
  non-www if Vercel is configured that way.
- `/ads.txt` returns the Google seller line.
- `/robots.txt` allows public crawling, blocks `/api/`, and lists the sitemap
  index.
- `/sitemap_index.xml` returns the XML sitemap index.
- `/sitemap.xml` redirects to `/sitemap_index.xml`.
- `wp.telenorquiztoday.com.pk` remains on Hostinger and the WordPress REST API
  stays reachable for Vercel.

Do not delete the Hostinger WordPress installation, database, or `wp.`
subdomain. Only the public root domain should point to Vercel.

## Latest Deployment Update - 2026-06-27

Current deployment-sensitive behavior:

- `vercel.json` runs `/api/cron/midnight` at `13:00 UTC` and `19:00 UTC`.
- `13:00 UTC` updates SEO-facing homepage date data six hours early.
- `19:00 UTC` updates the visible homepage date at midnight Pakistan time.
- The cron endpoint revalidates `/`, `/sitemap_index.xml`, and
  `/page-sitemap.xml`.
- `WORDPRESS_API_URL` remains the required source for WordPress REST data and
  for deriving the allowed WordPress media host in `next.config.js`.
- The public site remains canonical on the non-www root domain in source
  metadata, schema, robots, and sitemaps.
