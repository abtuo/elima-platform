-- Server-verified quiz attempts. Existing quiz history is preserved as legacy data.

alter table public.quiz_attempts
  add column if not exists score_trust text not null default 'legacy_client_reported',
  add column if not exists server_attempt_id uuid;

alter table public.user_progress
  add column if not exists verified_xp integer not null default 0 check (verified_xp >= 0),
  add column if not exists verified_streak_days integer not null default 0 check (verified_streak_days >= 0),
  add column if not exists verified_completed_quiz_count integer not null default 0 check (verified_completed_quiz_count >= 0),
  add column if not exists verified_average_score numeric(5,2) not null default 0 check (verified_average_score between 0 and 100),
  add column if not exists verified_last_activity_date date;

alter table public.quiz_attempts
  drop constraint if exists quiz_attempts_score_trust_check;
alter table public.quiz_attempts
  add constraint quiz_attempts_score_trust_check
  check (score_trust in ('legacy_client_reported', 'server_verified'));

create unique index if not exists uq_quiz_attempts_server_attempt
  on public.quiz_attempts(server_attempt_id)
  where server_attempt_id is not null;

create table if not exists public.quiz_attempt_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_ref text not null,
  subject_label text,
  topic text,
  source text not null default 'catalog' check (source in ('catalog', 'generated', 'document')),
  source_document_id uuid,
  question_snapshot jsonb not null,
  submitted_answers jsonb,
  result jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'expired')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quiz_attempt_sessions_snapshot_check check (
    jsonb_typeof(question_snapshot) = 'object'
    and jsonb_typeof(question_snapshot -> 'questions') = 'array'
    and jsonb_array_length(question_snapshot -> 'questions') > 0
  )
);

alter table public.quiz_attempts
  drop constraint if exists quiz_attempts_server_attempt_id_fkey;
alter table public.quiz_attempts
  add constraint quiz_attempts_server_attempt_id_fkey
  foreign key (server_attempt_id) references public.quiz_attempt_sessions(id) on delete set null;

create index if not exists idx_quiz_attempt_sessions_user_started
  on public.quiz_attempt_sessions(user_id, started_at desc);

alter table public.quiz_attempt_sessions enable row level security;
revoke all on table public.quiz_attempt_sessions from public, anon, authenticated;
grant select, insert, update, delete on table public.quiz_attempt_sessions to service_role;

-- Catalog metadata remains readable, but questions, answers and corrections are now server-only.
alter policy quiz_questions_read on public.quiz_questions to authenticated using (false);
alter policy quiz_answers_read on public.quiz_answers to authenticated using (false);
revoke select on table public.quiz_questions from anon, authenticated;
revoke select on table public.quiz_answers from anon, authenticated;

create or replace function public.submit_revision_quiz_attempt(
  p_session_id uuid,
  p_user_id uuid,
  p_answers jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.quiz_attempt_sessions%rowtype;
  v_progress public.user_progress%rowtype;
  v_question jsonb;
  v_answer jsonb;
  v_answer_id text;
  v_total integer;
  v_correct integer := 0;
  v_score integer;
  v_xp integer;
  v_count integer;
  v_average numeric(5,2);
  v_streak integer;
  v_day date := timezone('utc', now())::date;
  v_attempt_id uuid;
  v_corrections jsonb := '[]'::jsonb;
  v_result jsonb;
begin
  if p_user_id is null or p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Invalid quiz submission';
  end if;

  select * into v_session
  from public.quiz_attempt_sessions
  where id = p_session_id and user_id = p_user_id
  for update;

  if not found then raise exception 'Quiz attempt not found'; end if;
  if v_session.status = 'submitted' then return v_session.result; end if;
  if v_session.status <> 'in_progress' then raise exception 'Quiz attempt is not active'; end if;

  v_total := jsonb_array_length(v_session.question_snapshot -> 'questions');
  if jsonb_array_length(p_answers) > v_total then raise exception 'Too many quiz answers'; end if;
  if (select count(*) from jsonb_array_elements(p_answers)) <>
     (select count(distinct item ->> 'questionId') from jsonb_array_elements(p_answers) item) then
    raise exception 'Duplicate quiz answer';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_answers) submitted
    where not exists (
      select 1 from jsonb_array_elements(v_session.question_snapshot -> 'questions') question_row
      where question_row ->> 'id' = submitted ->> 'questionId'
    )
  ) then
    raise exception 'Invalid quiz question';
  end if;

  for v_question in select value from jsonb_array_elements(v_session.question_snapshot -> 'questions') loop
    select value into v_answer
    from jsonb_array_elements(p_answers)
    where value ->> 'questionId' = v_question ->> 'id'
    limit 1;
    v_answer_id := v_answer ->> 'answerId';

    if v_answer_id is not null and not exists (
      select 1 from jsonb_array_elements(v_question -> 'options') option_row
      where option_row ->> 'id' = v_answer_id
    ) then
      raise exception 'Invalid answer option';
    end if;

    if v_answer_id is not null and v_answer_id = v_question ->> 'correctAnswerId' then
      v_correct := v_correct + 1;
    end if;
    v_corrections := v_corrections || jsonb_build_array(jsonb_build_object(
      'questionId', v_question ->> 'id',
      'correctAnswerId', v_question ->> 'correctAnswerId',
      'explanation', coalesce(v_question ->> 'explanation', '')
    ));
    v_answer := null;
    v_answer_id := null;
  end loop;

  v_score := round(v_correct * 100.0 / greatest(v_total, 1));
  v_xp := greatest(10, round(v_score * 0.5));

  select * into v_progress from public.user_progress where user_id = p_user_id for update;
  if not found then
    insert into public.user_progress(
      user_id, verified_xp, verified_streak_days, verified_completed_quiz_count,
      verified_average_score, verified_last_activity_date
    ) values (p_user_id, v_xp, 1, 1, v_score, v_day);
  else
    v_count := v_progress.verified_completed_quiz_count + 1;
    v_average := round(((v_progress.verified_average_score * v_progress.verified_completed_quiz_count) + v_score)::numeric / v_count, 2);
    v_streak := case
      when v_progress.verified_last_activity_date = v_day then v_progress.verified_streak_days
      when v_progress.verified_last_activity_date = v_day - 1 then v_progress.verified_streak_days + 1
      else 1
    end;
    update public.user_progress set
      verified_xp = verified_xp + v_xp,
      verified_streak_days = v_streak,
      verified_completed_quiz_count = v_count,
      verified_average_score = v_average,
      verified_last_activity_date = greatest(coalesce(verified_last_activity_date, v_day), v_day),
      updated_at = now()
    where user_id = p_user_id;
  end if;

  insert into public.quiz_attempts(
    user_id, quiz_ref, subject_label, topic, source, source_document_id,
    score, total_questions, correct_answers, earned_xp, completed_at,
    score_trust, server_attempt_id
  ) values (
    p_user_id, v_session.quiz_ref, v_session.subject_label, v_session.topic,
    v_session.source, v_session.source_document_id, v_score, v_total, v_correct,
    v_xp, now(), 'server_verified', v_session.id
  ) returning id into v_attempt_id;

  v_result := jsonb_build_object(
    'attemptId', v_attempt_id,
    'sessionId', v_session.id,
    'score', v_score,
    'totalQuestions', v_total,
    'correctAnswers', v_correct,
    'earnedXp', v_xp,
    'scoreTrust', 'server_verified',
    'corrections', v_corrections
  );

  update public.quiz_attempt_sessions set
    status = 'submitted', submitted_answers = p_answers, result = v_result,
    submitted_at = now(), updated_at = now()
  where id = v_session.id;

  return v_result;
end;
$$;

revoke all on function public.submit_revision_quiz_attempt(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.submit_revision_quiz_attempt(uuid, uuid, jsonb) to service_role;

-- The historical RPC remains for database compatibility but can no longer be called by clients.
revoke all on function public.record_quiz_attempt(text, text, integer, integer, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.record_quiz_attempt(text, text, integer, integer, integer, timestamptz) to service_role;
