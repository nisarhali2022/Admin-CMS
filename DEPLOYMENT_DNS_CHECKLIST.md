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
NEXT_PUBLIC_ADSENSE_ID
```

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

Expected: opens or redirects to the Vercel website.

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
