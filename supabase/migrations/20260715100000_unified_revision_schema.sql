-- Module Révision pour la base Elima commune.
-- Toutes les références utilisateur pointent vers le même auth.users que le
-- scolaire. Les scripts de seed utilisent la service role ; les clients
-- authentifiés n'ont aucun droit d'écriture sur le catalogue de quiz.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.student_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  age smallint,
  school_level_id text not null default '',
  school_track_id text,
  enrolled_subject_ids text[],
  role text not null default 'eleve',
  cgu_accepted_at timestamptz,
  cgu_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_profiles_age_check check (age is null or age between 6 and 99)
);

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  streak_days integer not null default 0 check (streak_days >= 0),
  completed_quiz_count integer not null default 0 check (completed_quiz_count >= 0),
  average_score numeric(5,2) not null default 0 check (average_score between 0 and 100),
  last_activity_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_daily_hints (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  hints_used smallint not null default 0 check (hints_used between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_ref text not null,
  subject_label text,
  score smallint not null check (score between 0 and 100),
  total_questions smallint not null check (total_questions > 0),
  correct_answers smallint not null check (correct_answers >= 0 and correct_answers <= total_questions),
  earned_xp integer not null check (earned_xp >= 0),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.scanned_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_path text not null,
  analysis text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_sets (
  id uuid primary key default gen_random_uuid(),
  cache_key text unique,
  level text not null,
  subject text not null,
  topic text not null,
  subject_label text,
  level_label text,
  school_track_id text,
  difficulty smallint check (difficulty is null or difficulty between 1 and 5),
  question_count integer not null default 0 check (question_count >= 0),
  play_count integer not null default 0 check (play_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_set_id uuid not null references public.quiz_sets(id) on delete cascade,
  external_id text unique,
  question_order integer not null default 0 check (question_order >= 0),
  prompt text not null,
  hint text,
  explanation text,
  difficulty smallint check (difficulty is null or difficulty between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  answer_id text not null check (answer_id ~ '^[A-Za-z0-9_-]{1,32}$'),
  answer_order integer not null default 0 check (answer_order >= 0),
  answer_text text not null,
  is_correct boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, answer_id)
);

create table if not exists public.cached_course_summaries (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  level text not null,
  subject text not null,
  topic text not null,
  subject_label text,
  level_label text,
  content text not null,
  play_count integer not null default 0 check (play_count >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.user_course_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cached_summary_id uuid references public.cached_course_summaries(id) on delete set null,
  cache_key text not null,
  level_id text not null,
  level_label text not null,
  subject_id text not null,
  subject_label text not null,
  topic text not null,
  content text not null,
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, cache_key)
);

create index if not exists idx_quiz_attempts_user_completed_at on public.quiz_attempts(user_id, completed_at desc);
create index if not exists idx_scanned_exams_user_created_at on public.scanned_exams(user_id, created_at desc);
create index if not exists idx_quiz_sets_level_subject on public.quiz_sets(level, subject);
create index if not exists idx_quiz_sets_level_track on public.quiz_sets(level, school_track_id);
create index if not exists idx_quiz_questions_set_order on public.quiz_questions(quiz_set_id, question_order);
create index if not exists idx_quiz_answers_question_order on public.quiz_answers(question_id, answer_order);
create unique index if not exists uq_quiz_answers_single_correct on public.quiz_answers(question_id) where is_correct;
create index if not exists idx_user_course_summaries_user_created_at on public.user_course_summaries(user_id, created_at desc);

drop trigger if exists trg_student_profiles_updated_at on public.student_profiles;
create trigger trg_student_profiles_updated_at before update on public.student_profiles
for each row execute function public.set_updated_at();
drop trigger if exists trg_user_progress_updated_at on public.user_progress;
create trigger trg_user_progress_updated_at before update on public.user_progress
for each row execute function public.set_updated_at();
drop trigger if exists trg_user_daily_hints_updated_at on public.user_daily_hints;
create trigger trg_user_daily_hints_updated_at before update on public.user_daily_hints
for each row execute function public.set_updated_at();
drop trigger if exists trg_quiz_sets_updated_at on public.quiz_sets;
create trigger trg_quiz_sets_updated_at before update on public.quiz_sets
for each row execute function public.set_updated_at();
drop trigger if exists trg_quiz_questions_updated_at on public.quiz_questions;
create trigger trg_quiz_questions_updated_at before update on public.quiz_questions
for each row execute function public.set_updated_at();
drop trigger if exists trg_quiz_answers_updated_at on public.quiz_answers;
create trigger trg_quiz_answers_updated_at before update on public.quiz_answers
for each row execute function public.set_updated_at();
drop trigger if exists trg_user_course_summaries_updated_at on public.user_course_summaries;
create trigger trg_user_course_summaries_updated_at before update on public.user_course_summaries
for each row execute function public.set_updated_at();

alter table public.student_profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.user_daily_hints enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.scanned_exams enable row level security;
alter table public.quiz_sets enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.cached_course_summaries enable row level security;
alter table public.user_course_summaries enable row level security;

drop policy if exists student_profiles_select_own on public.student_profiles;
drop policy if exists student_profiles_insert_own on public.student_profiles;
drop policy if exists student_profiles_update_own on public.student_profiles;
create policy student_profiles_select_own on public.student_profiles for select to authenticated using (id = auth.uid());
create policy student_profiles_insert_own on public.student_profiles for insert to authenticated with check (id = auth.uid());
create policy student_profiles_update_own on public.student_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists user_progress_select_own on public.user_progress;
drop policy if exists user_progress_insert_own on public.user_progress;
drop policy if exists user_progress_update_own on public.user_progress;
create policy user_progress_select_own on public.user_progress for select to authenticated using (user_id = auth.uid());

drop policy if exists user_daily_hints_select_own on public.user_daily_hints;
create policy user_daily_hints_select_own on public.user_daily_hints for select to authenticated using (user_id = auth.uid());

drop policy if exists quiz_attempts_select_own on public.quiz_attempts;
drop policy if exists quiz_attempts_insert_own on public.quiz_attempts;
create policy quiz_attempts_select_own on public.quiz_attempts for select to authenticated using (user_id = auth.uid());

drop policy if exists scanned_exams_select_own on public.scanned_exams;
drop policy if exists scanned_exams_insert_own on public.scanned_exams;
create policy scanned_exams_select_own on public.scanned_exams for select to authenticated using (user_id = auth.uid());
create policy scanned_exams_insert_own on public.scanned_exams for insert to authenticated with check (user_id = auth.uid());

drop policy if exists quiz_sets_read on public.quiz_sets;
drop policy if exists quiz_sets_insert on public.quiz_sets;
drop policy if exists quiz_sets_update on public.quiz_sets;
create policy quiz_sets_read on public.quiz_sets for select to authenticated using (true);

drop policy if exists quiz_questions_read on public.quiz_questions;
drop policy if exists quiz_questions_insert on public.quiz_questions;
drop policy if exists quiz_questions_update on public.quiz_questions;
create policy quiz_questions_read on public.quiz_questions for select to authenticated using (true);

drop policy if exists quiz_answers_read on public.quiz_answers;
drop policy if exists quiz_answers_insert on public.quiz_answers;
drop policy if exists quiz_answers_update on public.quiz_answers;
create policy quiz_answers_read on public.quiz_answers for select to authenticated using (true);

drop policy if exists cached_course_summaries_read on public.cached_course_summaries;
drop policy if exists cached_course_summaries_insert on public.cached_course_summaries;
drop policy if exists cached_course_summaries_update_play on public.cached_course_summaries;
create policy cached_course_summaries_read on public.cached_course_summaries for select to authenticated using (true);

drop policy if exists user_course_summaries_select_own on public.user_course_summaries;
drop policy if exists user_course_summaries_insert_own on public.user_course_summaries;
drop policy if exists user_course_summaries_update_own on public.user_course_summaries;
create policy user_course_summaries_select_own on public.user_course_summaries for select to authenticated using (user_id = auth.uid());
create policy user_course_summaries_insert_own on public.user_course_summaries for insert to authenticated with check (user_id = auth.uid());
create policy user_course_summaries_update_own on public.user_course_summaries for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.consume_daily_hint(p_max_per_day integer default 5)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_day date := timezone('utc', now())::date;
  v_cur integer;
  v_max integer := greatest(1, coalesce(p_max_per_day, 5));
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  insert into public.user_daily_hints(user_id, usage_date, hints_used)
  values (v_uid, v_day, 0) on conflict (user_id, usage_date) do nothing;
  select hints_used into v_cur from public.user_daily_hints
  where user_id = v_uid and usage_date = v_day for update;
  if v_cur >= v_max then
    return jsonb_build_object('ok', false, 'used', v_cur, 'limit', v_max, 'remaining', 0);
  end if;
  update public.user_daily_hints set hints_used = hints_used + 1, updated_at = now()
  where user_id = v_uid and usage_date = v_day returning hints_used into v_cur;
  return jsonb_build_object('ok', true, 'used', v_cur, 'limit', v_max, 'remaining', greatest(0, v_max - v_cur));
end;
$$;

revoke all on function public.consume_daily_hint(integer) from public;
grant execute on function public.consume_daily_hint(integer) to authenticated;

create or replace function public.record_quiz_attempt(
  p_quiz_ref text,
  p_subject_label text,
  p_score integer,
  p_total_questions integer,
  p_correct_answers integer,
  p_completed_at timestamptz default now()
) returns public.quiz_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_day date := timezone('utc', p_completed_at)::date;
  v_progress public.user_progress%rowtype;
  v_attempt public.quiz_attempts%rowtype;
  v_xp integer := greatest(10, round(p_score * 0.5));
  v_count integer;
  v_average numeric(5,2);
  v_streak integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_total_questions <= 0 or p_score not between 0 and 100 or p_correct_answers not between 0 and p_total_questions then
    raise exception 'Invalid quiz result';
  end if;

  select * into v_progress from public.user_progress where user_id = v_uid for update;
  if not found then
    insert into public.user_progress(user_id, xp, streak_days, completed_quiz_count, average_score, last_activity_date)
    values (v_uid, v_xp, 1, 1, p_score, v_day);
  else
    v_count := v_progress.completed_quiz_count + 1;
    v_average := round(((v_progress.average_score * v_progress.completed_quiz_count) + p_score)::numeric / v_count, 2);
    v_streak := case
      when v_progress.last_activity_date = v_day then v_progress.streak_days
      when v_progress.last_activity_date = v_day - 1 then v_progress.streak_days + 1
      else 1
    end;
    update public.user_progress set xp = xp + v_xp, streak_days = v_streak,
      completed_quiz_count = v_count, average_score = v_average,
      last_activity_date = greatest(coalesce(last_activity_date, v_day), v_day), updated_at = now()
    where user_id = v_uid;
  end if;

  insert into public.quiz_attempts(user_id, quiz_ref, subject_label, score, total_questions, correct_answers, earned_xp, completed_at)
  values (v_uid, p_quiz_ref, p_subject_label, p_score, p_total_questions, p_correct_answers, v_xp, p_completed_at)
  returning * into v_attempt;
  return v_attempt;
end;
$$;

revoke all on function public.record_quiz_attempt(text, text, integer, integer, integer, timestamptz) from public;
grant execute on function public.record_quiz_attempt(text, text, integer, integer, integer, timestamptz) to authenticated;
