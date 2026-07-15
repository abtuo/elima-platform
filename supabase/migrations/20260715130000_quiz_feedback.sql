create table if not exists public.quiz_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_ref text not null,
  subject_label text,
  rating smallint not null check (rating between 1 and 5),
  difficulty_perception text not null check (difficulty_perception in ('too_easy', 'balanced', 'too_hard')),
  created_at timestamptz not null default now()
);

create index if not exists idx_quiz_feedback_quiz_created_at
  on public.quiz_feedback(quiz_ref, created_at desc);
create index if not exists idx_quiz_feedback_user_created_at
  on public.quiz_feedback(user_id, created_at desc);

alter table public.quiz_feedback enable row level security;

drop policy if exists quiz_feedback_select_own on public.quiz_feedback;
drop policy if exists quiz_feedback_insert_own on public.quiz_feedback;
create policy quiz_feedback_select_own on public.quiz_feedback
  for select to authenticated using (user_id = auth.uid());
create policy quiz_feedback_insert_own on public.quiz_feedback
  for insert to authenticated with check (user_id = auth.uid());
