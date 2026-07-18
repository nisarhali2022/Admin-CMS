-- Structured defaults for the editable Home template.  Existing websites are
-- intentionally not modified here; use the reviewed, explicit seed script for
-- a selected inactive/staging website.

create or replace function public.cms_default_home_content()
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'heroTitle', '',
    'heroText', '',
    'ctaLabel', '',
    'ctaHref', '',
    'introHtml', '',
    'latestNewsTitle', '',
    'quizHeadingTemplate', '',
    'conclusionHeading', '',
    'conclusionHtml', '',
    'stepsHeading', '',
    'faqHeading', '',
    'quizInfoSections', '[]'::jsonb,
    'steps', '[]'::jsonb,
    'faqs', '[]'::jsonb
  );
$$;

revoke all on function public.cms_default_home_content() from public, anon, authenticated;
grant execute on function public.cms_default_home_content() to service_role;

notify pgrst, 'reload schema';
