-- Lot 2 — Scolaire: cahier de textes + ressources de devoirs (additif, idempotent).

-- 1) Ressource/fichier optionnel attaché à un devoir.
alter table public.homeworks add column if not exists resource_url text;

-- 2) Cahier de textes (contenu de cours par séance).
create table if not exists public.lesson_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  term_id uuid references public.terms(id) on delete set null,
  lesson_date date not null,
  content text not null,
  resource_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_lesson_logs_school on public.lesson_logs(school_id);
create index if not exists idx_lesson_logs_class on public.lesson_logs(class_id);
create index if not exists idx_lesson_logs_date on public.lesson_logs(lesson_date);

alter table public.lesson_logs enable row level security;
