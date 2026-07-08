create or replace function public.cms_global_quiz_questions_valid(input_questions jsonb)
returns boolean
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  question_item jsonb;
  answer_text text;
  valid_option_count integer;
  matching_option_count integer;
begin
  if jsonb_typeof(input_questions) <> 'array' or jsonb_array_length(input_questions) <> 5 then
    return false;
  end if;

  for question_item in
    select value from jsonb_array_elements(input_questions)
  loop
    if nullif(trim(question_item ->> 'question'), '') is null then
      return false;
    end if;

    if jsonb_typeof(question_item -> 'options') <> 'array'
      or jsonb_array_length(question_item -> 'options') <> 4 then
      return false;
    end if;

    answer_text := nullif(trim(question_item ->> 'answer'), '');
    if answer_text is null then
      return false;
    end if;

    select
      count(*) filter (where trim(value) <> ''),
      count(*) filter (where lower(trim(value)) = lower(answer_text))
    into valid_option_count, matching_option_count
    from jsonb_array_elements_text(question_item -> 'options');

    if valid_option_count <> 4 or matching_option_count < 1 then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create table public.cms_global_quiz (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  description text,
  questions jsonb not null,
  is_published boolean not null default true,
  visible_date date not null,
  seo_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cms_global_quiz_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint cms_global_quiz_questions_valid_check check (public.cms_global_quiz_questions_valid(questions))
);

create index cms_global_quiz_published_updated_idx
on public.cms_global_quiz (is_published, updated_at desc);

create trigger cms_global_quiz_set_updated_at
before update on public.cms_global_quiz
for each row execute function public.cms_set_updated_at();

alter table public.cms_global_quiz enable row level security;

revoke all privileges on table public.cms_global_quiz from anon, authenticated;
grant select, insert, update, delete on table public.cms_global_quiz to service_role;

create or replace function public.cms_public_get_current_quiz()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'title', q.title,
    'slug', q.slug,
    'description', q.description,
    'questions', q.questions,
    'visibleDate', q.visible_date,
    'seoDate', q.seo_date,
    'updatedAt', q.updated_at
  )
  from public.cms_global_quiz q
  where q.is_published = true
  order by q.visible_date desc, q.updated_at desc
  limit 1;
$$;

revoke all on function public.cms_global_quiz_questions_valid(jsonb) from PUBLIC, anon, authenticated;
revoke all on function public.cms_public_get_current_quiz() from PUBLIC, anon, authenticated;

grant execute on function public.cms_global_quiz_questions_valid(jsonb) to service_role;
grant execute on function public.cms_public_get_current_quiz() to anon;
