-- Keep the local website's two visible daily Home headings automatically dated.
-- This touches only the date text in the existing H1 and the "Today Telenor Answer" H2.
-- All other editor HTML, links, media, and paragraphs remain unchanged.

update public.cms_template_content template
set content_data = jsonb_set(
  coalesce(template.content_data, '{}'::jsonb),
  '{heroText}',
  to_jsonb(
    regexp_replace(
      regexp_replace(
        coalesce(template.content_data ->> 'heroText', ''),
        '(<h1[^>]*>[^<]*)([0-9]{1,2}[[:space:]]+(January|February|March|April|May|June|July|August|September|October|November|December)[[:space:]]+20[0-9]{2})',
        E'\\1{date}',
        'i'
      ),
      '(<h2[^>]*>Today[[:space:]]+Telenor[[:space:]]+Answer[[:space:]]+)([0-9]{1,2}[[:space:]]+(January|February|March|April|May|June|July|August|September|October|November|December)[[:space:]]+20[0-9]{2})',
      E'\\1{date}',
      'i'
    )
  ),
  true
)
where template.template_key = 'home'
  and exists (
    select 1
    from public.cms_website_domains domain
    where domain.website_id = template.website_id
      and lower(domain.domain) = 'test.telenorquiztoday.com.pk'
  )
  and (
    coalesce(template.content_data ->> 'heroText', '') ~* '<h1[^>]*>[^<]*[0-9]{1,2}[[:space:]]+(January|February|March|April|May|June|July|August|September|October|November|December)[[:space:]]+20[0-9]{2}'
    or coalesce(template.content_data ->> 'heroText', '') ~* '<h2[^>]*>Today[[:space:]]+Telenor[[:space:]]+Answer[[:space:]]+[0-9]{1,2}[[:space:]]+(January|February|March|April|May|June|July|August|September|October|November|December)[[:space:]]+20[0-9]{2}'
  );
