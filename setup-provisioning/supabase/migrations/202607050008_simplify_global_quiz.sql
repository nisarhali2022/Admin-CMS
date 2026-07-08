alter table public.cms_global_quiz
  rename column id to quiz_id;

alter table public.cms_global_quiz
  drop constraint if exists cms_global_quiz_slug_format;

alter table public.cms_global_quiz
  drop column if exists title,
  drop column if exists slug,
  drop column if exists description,
  drop column if exists visible_date,
  drop column if exists seo_date,
  drop column if exists created_at;

delete from public.cms_global_quiz q
using (
  select quiz_id
  from public.cms_global_quiz
  order by updated_at desc
  limit 1
) keep
where q.quiz_id <> keep.quiz_id;

drop index if exists public.cms_global_quiz_published_updated_idx;

create unique index cms_global_quiz_singleton_idx
on public.cms_global_quiz ((true));

create index cms_global_quiz_published_updated_idx
on public.cms_global_quiz (is_published, updated_at desc);

create or replace function public.cms_public_get_current_quiz()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'quizId', q.quiz_id,
    'questions', q.questions,
    'updatedAt', q.updated_at
  )
  from public.cms_global_quiz q
  where q.is_published = true
  order by q.updated_at desc
  limit 1;
$$;

revoke all on function public.cms_public_get_current_quiz() from PUBLIC, anon, authenticated;
grant execute on function public.cms_public_get_current_quiz() to anon;
