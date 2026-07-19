create extension if not exists pgcrypto;

create table if not exists public.learning_levels (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  label text not null,
  country_code text,
  education_system text,
  is_exam_level boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_subjects (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  label text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_chapters (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  subject_id uuid not null references public.learning_subjects(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_exercises (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  title text not null,
  description text,
  country_code text,
  education_system text,
  level_id uuid not null references public.learning_levels(id),
  subject_id uuid not null references public.learning_subjects(id),
  chapter_id uuid references public.learning_chapters(id),
  difficulty text not null default 'intermediaire',
  estimated_minutes integer not null default 15 check (estimated_minutes > 0),
  total_points numeric not null default 0 check (total_points >= 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  source_type text not null default 'exercise_bank',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_exercise_parts (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.learning_exercises(id) on delete cascade,
  external_id text,
  title text not null,
  position integer not null check (position >= 0),
  metadata jsonb not null default '{}'::jsonb,
  unique (exercise_id, external_id), unique (exercise_id, position)
);

create table if not exists public.learning_questions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.learning_exercises(id) on delete cascade,
  part_id uuid references public.learning_exercise_parts(id) on delete cascade,
  parent_question_id uuid references public.learning_questions(id) on delete cascade,
  external_id text not null,
  title text,
  prompt text not null,
  question_type text not null default 'text',
  position integer not null check (position >= 0),
  points numeric not null default 0 check (points >= 0),
  skills jsonb not null default '[]'::jsonb,
  public_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (exercise_id, external_id), unique (exercise_id, position)
);

create table if not exists public.learning_question_secrets (
  question_id uuid primary key references public.learning_questions(id) on delete cascade,
  expected_answer jsonb not null,
  validation_config jsonb not null,
  correction_metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_question_hints (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.learning_questions(id) on delete cascade,
  level integer not null check (level between 1 and 2),
  content text not null,
  position integer not null,
  score_penalty numeric not null default 0 check (score_penalty >= 0),
  unique (question_id, level)
);

create table if not exists public.learning_solution_steps (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.learning_questions(id) on delete cascade,
  position integer not null,
  title text,
  content text not null,
  validation_config jsonb,
  unique (question_id, position)
);

create table if not exists public.exam_subjects (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  slug text not null unique,
  title text not null,
  country_code text,
  education_system text,
  level_id uuid not null references public.learning_levels(id),
  subject_id uuid not null references public.learning_subjects(id),
  year integer,
  session text,
  exam_type text not null default 'official',
  duration_minutes integer not null check (duration_minutes > 0),
  total_points numeric not null check (total_points > 0),
  coefficient numeric,
  source_pdf_path text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  instructions jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_subject_exercises (
  exam_subject_id uuid not null references public.exam_subjects(id) on delete cascade,
  exercise_id uuid not null references public.learning_exercises(id) on delete restrict,
  position integer not null,
  points_override numeric,
  metadata jsonb not null default '{}'::jsonb,
  primary key (exam_subject_id, exercise_id), unique (exam_subject_id, position)
);

create table if not exists public.learning_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('guided_exercise','exam')),
  exercise_id uuid references public.learning_exercises(id),
  exam_subject_id uuid references public.exam_subjects(id),
  mode text not null check (mode in ('guided','exam')),
  status text not null default 'in_progress' check (status in ('in_progress','submitted','completed','abandoned')),
  started_at timestamptz not null default now(), completed_at timestamptz,
  elapsed_seconds integer not null default 0, current_question_id uuid references public.learning_questions(id),
  raw_score numeric not null default 0, adjusted_score numeric not null default 0, max_score numeric not null default 0,
  hints_used integer not null default 0, metadata jsonb not null default '{}'::jsonb,
  constraint learning_attempt_target check (
    (content_type='guided_exercise' and exercise_id is not null and exam_subject_id is null) or
    (content_type='exam' and exam_subject_id is not null and exercise_id is null)
  )
);

create table if not exists public.learning_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.learning_attempts(id) on delete cascade,
  question_id uuid not null references public.learning_questions(id),
  raw_answer text, structured_answer jsonb, status text,
  is_correct boolean, score_awarded numeric not null default 0,
  attempts_count integer not null default 0, hints_used integer not null default 0,
  confidence_level text check (confidence_level is null or confidence_level in ('low','medium','high')),
  detected_error_type text, feedback jsonb not null default '{}'::jsonb,
  answered_at timestamptz not null default now(), unique (attempt_id, question_id)
);

create table if not exists public.student_skill_state (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.learning_subjects(id), skill_key text not null,
  mastery_score numeric not null default 0 check (mastery_score between 0 and 100),
  confidence_score numeric not null default 0 check (confidence_score between 0 and 100),
  attempts_count integer not null default 0, success_count integer not null default 0,
  assisted_success_count integer not null default 0, repeated_error_count integer not null default 0,
  last_error_type text, last_practiced_at timestamptz, metadata jsonb not null default '{}'::jsonb,
  unique (user_id, subject_id, skill_key)
);

create index if not exists idx_learning_exercises_filter on public.learning_exercises(level_id,subject_id,status);
create index if not exists idx_exam_subjects_filter on public.exam_subjects(level_id,subject_id,status);
create index if not exists idx_learning_questions_order on public.learning_questions(exercise_id,position);
create index if not exists idx_learning_attempts_user_status on public.learning_attempts(user_id,status,started_at desc);
create index if not exists idx_learning_answers_attempt on public.learning_answers(attempt_id);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='trg_learning_levels_updated_at') then
    create trigger trg_learning_levels_updated_at before update on public.learning_levels for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='trg_learning_exercises_updated_at') then
    create trigger trg_learning_exercises_updated_at before update on public.learning_exercises for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='trg_exam_subjects_updated_at') then
    create trigger trg_exam_subjects_updated_at before update on public.exam_subjects for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.learning_levels enable row level security;
alter table public.learning_subjects enable row level security;
alter table public.learning_chapters enable row level security;
alter table public.learning_exercises enable row level security;
alter table public.learning_exercise_parts enable row level security;
alter table public.learning_questions enable row level security;
alter table public.learning_question_secrets enable row level security;
alter table public.learning_question_hints enable row level security;
alter table public.learning_solution_steps enable row level security;
alter table public.exam_subjects enable row level security;
alter table public.exam_subject_exercises enable row level security;
alter table public.learning_attempts enable row level security;
alter table public.learning_answers enable row level security;
alter table public.student_skill_state enable row level security;

create policy learning_levels_read on public.learning_levels for select to authenticated using (true);
create policy learning_subjects_read on public.learning_subjects for select to authenticated using (true);
create policy learning_chapters_read on public.learning_chapters for select to authenticated using (true);
create policy learning_exercises_read on public.learning_exercises for select to authenticated using (status='published');
create policy learning_parts_read on public.learning_exercise_parts for select to authenticated using (exists(select 1 from public.learning_exercises e where e.id=exercise_id and e.status='published'));
create policy learning_questions_read on public.learning_questions for select to authenticated using (exists(select 1 from public.learning_exercises e where e.id=exercise_id and e.status='published'));
create policy exam_subjects_read on public.exam_subjects for select to authenticated using (status='published');
create policy exam_subject_exercises_read on public.exam_subject_exercises for select to authenticated using (exists(select 1 from public.exam_subjects e where e.id=exam_subject_id and e.status='published'));
create policy learning_attempts_own on public.learning_attempts for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy learning_answers_own on public.learning_answers for all to authenticated using(exists(select 1 from public.learning_attempts a where a.id=attempt_id and a.user_id=auth.uid())) with check(exists(select 1 from public.learning_attempts a where a.id=attempt_id and a.user_id=auth.uid()));
create policy student_skill_state_own on public.student_skill_state for select to authenticated using(user_id=auth.uid());
create policy learning_attempts_teacher_class_read on public.learning_attempts for select to authenticated using (
  exists (
    select 1 from public.students student
    join public.teacher_subject_classes teaching on teaching.class_id = student.class_id
    join public.teachers teacher on teacher.id = teaching.teacher_id
    where student.user_id = learning_attempts.user_id and teacher.user_id = auth.uid()
  )
);
create policy learning_answers_teacher_class_read on public.learning_answers for select to authenticated using (
  exists (
    select 1 from public.learning_attempts attempt
    join public.students student on student.user_id = attempt.user_id
    join public.teacher_subject_classes teaching on teaching.class_id = student.class_id
    join public.teachers teacher on teacher.id = teaching.teacher_id
    where attempt.id = learning_answers.attempt_id and teacher.user_id = auth.uid()
  )
);

-- Aucun droit direct n'est accordé aux élèves sur les secrets, indices ou corrections.
revoke all on public.learning_question_secrets, public.learning_question_hints, public.learning_solution_steps from anon, authenticated;

insert into storage.buckets(id,name,public) values ('exam-sources','exam-sources',false)
on conflict(id) do update set public=false;
