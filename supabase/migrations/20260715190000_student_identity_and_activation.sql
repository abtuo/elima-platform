create extension if not exists pgcrypto;

create table if not exists public.student_prospects (
  user_id uuid primary key references auth.users(id) on delete cascade,
  declared_school_name text,
  declared_school_city text,
  school_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_activation_codes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '30 days'),
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint student_activation_code_use_check check (used_at is null or used_by is not null)
);
create unique index if not exists uq_student_activation_code_available on public.student_activation_codes(student_id) where used_at is null and revoked_at is null;
create index if not exists idx_student_activation_codes_school on public.student_activation_codes(school_id, created_at desc);
alter table public.student_prospects enable row level security;
alter table public.student_activation_codes enable row level security;
drop policy if exists student_prospects_read_own on public.student_prospects;
drop policy if exists student_prospects_update_own on public.student_prospects;
create policy student_prospects_read_own on public.student_prospects for select to authenticated using (user_id = auth.uid());
create policy student_prospects_update_own on public.student_prospects for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on table public.student_activation_codes from anon, authenticated;
