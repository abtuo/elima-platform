create table if not exists public.student_revision_subject_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text not null check (char_length(subject_id) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (user_id, subject_id)
);

create table if not exists public.revision_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  title text not null,
  subject_id text,
  subject_label text,
  student_level text,
  detected_level text,
  document_type text,
  status text not null default 'ready' check (status in ('analyzing', 'ready', 'error')),
  analysis jsonb not null default '{}'::jsonb,
  quiz_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_revision_documents_user_created
  on public.revision_documents(user_id, created_at desc);

alter table public.quiz_attempts add column if not exists topic text;
alter table public.quiz_attempts add column if not exists source text not null default 'catalog'
  check (source in ('catalog', 'generated', 'document'));
alter table public.quiz_attempts add column if not exists source_document_id uuid
  references public.revision_documents(id) on delete set null;

alter table public.student_revision_subject_preferences enable row level security;
alter table public.revision_documents enable row level security;

create policy revision_subject_preferences_own
on public.student_revision_subject_preferences for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy revision_documents_read_own
on public.revision_documents for select to authenticated
using (user_id = auth.uid());

create policy revision_documents_update_own
on public.revision_documents for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy quiz_attempts_update_own
on public.quiz_attempts for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
