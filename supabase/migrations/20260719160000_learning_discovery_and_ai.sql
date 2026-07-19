create index if not exists idx_learning_chapters_subject_label
  on public.learning_chapters(subject_id, label);

create index if not exists idx_exam_subject_exercises_exercise
  on public.exam_subject_exercises(exercise_id, exam_subject_id);

create table if not exists public.learning_ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.learning_attempts(id) on delete cascade,
  answer_id uuid not null references public.learning_answers(id) on delete cascade,
  question_id uuid not null references public.learning_questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model text not null,
  prompt_version text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_learning_ai_evaluations_attempt
  on public.learning_ai_evaluations(attempt_id, created_at desc);

alter table public.learning_ai_evaluations enable row level security;

create policy learning_ai_evaluations_own_read
  on public.learning_ai_evaluations for select to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.learning_ai_evaluations from anon, authenticated;
