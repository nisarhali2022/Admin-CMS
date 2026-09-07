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
  if jsonb_typeof(input_questions) <> 'array'
    or jsonb_array_length(input_questions) < 5
    or jsonb_array_length(input_questions) > 10 then
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

alter table public.cms_global_quiz
  drop constraint if exists cms_global_quiz_questions_valid_check;

alter table public.cms_global_quiz
  add constraint cms_global_quiz_questions_valid_check
  check (public.cms_global_quiz_questions_valid(questions));

revoke all on function public.cms_global_quiz_questions_valid(jsonb) from PUBLIC, anon, authenticated;
grant execute on function public.cms_global_quiz_questions_valid(jsonb) to service_role;

notify pgrst, 'reload schema';
