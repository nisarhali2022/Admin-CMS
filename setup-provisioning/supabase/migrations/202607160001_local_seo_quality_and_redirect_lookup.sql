-- Keep the public sitemap on canonical URLs and make redirect lookup O(1) per request.

create index if not exists cms_redirects_public_lookup_idx
  on public.cms_redirects (website_id, from_path)
  where is_active = true;

create or replace function public.get_public_redirect(domain text, from_path text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with requested_path as (
    select case
      when $2 = '/' then '/'
      else coalesce(nullif(regexp_replace($2, '/+$', ''), ''), '/')
    end as path
  )
  select jsonb_build_object(
    'fromPath', r.from_path,
    'toUrl', r.to_url,
    'redirectType', r.redirect_type
  )
  from public.cms_redirects r
  join requested_path request on request.path = r.from_path
  where r.website_id = public.cms_public_website_id($1)
    and r.is_active = true
  limit 1;
$$;

revoke all on function public.get_public_redirect(text, text) from PUBLIC, anon, authenticated;
grant execute on function public.get_public_redirect(text, text) to anon;

-- Older template records may still hold aliases. The public pages and sitemap use these paths as canonical.
update public.cms_template_content
set path = case template_key
  when 'about' then '/about-us'
  when 'contact' then '/contact-us'
  when 'privacy' then '/privacy-policy'
  else path
end
where template_key in ('about', 'contact', 'privacy');

-- Legacy and fallback pages must not be submitted as public search results.
update public.cms_pages
set sitemap_include = false,
    robots_meta = 'noindex,follow'
where path in ('/telenor-quiz-today', '/404-page');

-- Only fill the two missing imported descriptions; keep all existing editorial text unchanged.
update public.cms_pages
set meta_description = case path
  when '/disclaimer' then 'Read the Telenor Quiz Today disclaimer about independent operation, informational content, reward guidance, and no affiliation with Telenor Pakistan.'
  when '/terms-of-service' then 'Read the Terms of Service for Telenor Quiz Today, including acceptable use, content limitations, user responsibilities, and platform rules.'
  else meta_description
end
where path in ('/disclaimer', '/terms-of-service')
  and nullif(trim(coalesce(meta_description, '')), '') is null;

-- Replace only the literal date in the existing local site's Home H1; all other editor writing is preserved.
update public.cms_template_content template
set content_data = jsonb_set(
  coalesce(template.content_data, '{}'::jsonb),
  '{heroText}',
  to_jsonb(
    regexp_replace(
      coalesce(template.content_data ->> 'heroText', ''),
      '(<h1[^>]*>[^<]*)([0-9]{1,2}[[:space:]]+(January|February|March|April|May|June|July|August|September|October|November|December)[[:space:]]+20[0-9]{2})',
      E'\\1{date}',
      'i'
    )
  ),
  true
)
where template.template_key = 'home'
  and coalesce(template.content_data ->> 'heroText', '') not like '%{date}%'
  and exists (
    select 1
    from public.cms_website_domains domain
    where domain.website_id = template.website_id
      and lower(domain.domain) = 'test.telenorquiztoday.com.pk'
  );

-- Reuse the existing Home social image wherever an eligible public page has none.
with home_images as (
  select website_id, og_image_id
  from public.cms_template_content
  where template_key = 'home'
    and og_image_id is not null
)
update public.cms_template_content template
set og_image_id = home_images.og_image_id
from home_images
where template.website_id = home_images.website_id
  and template.template_key in ('about', 'contact', 'privacy')
  and template.og_image_id is null;

with home_images as (
  select website_id, og_image_id
  from public.cms_template_content
  where template_key = 'home'
    and og_image_id is not null
)
update public.cms_pages page
set featured_image_id = home_images.og_image_id
from home_images
where page.website_id = home_images.website_id
  and page.path in ('/disclaimer', '/terms-of-service')
  and page.featured_image_id is null;

notify pgrst, 'reload schema';
