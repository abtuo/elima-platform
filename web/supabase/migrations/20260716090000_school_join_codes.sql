create extension if not exists pgcrypto;

create table if not exists public.school_join_codes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  code_hash text not null unique,
  allowed_roles text[] not null default array['ADMIN', 'TEACHER', 'PARENT']::text[],
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_join_codes_roles_check check (allowed_roles <@ array['ADMIN', 'TEACHER', 'PARENT']::text[])
);

create index if not exists idx_school_join_codes_school_active
  on public.school_join_codes(school_id, active, created_at desc);

alter table public.school_join_codes enable row level security;
revoke all on table public.school_join_codes from anon, authenticated;

create or replace function public.create_school_join_code(
  p_code text,
  p_allowed_roles text[] default array['ADMIN', 'TEACHER', 'PARENT']::text[],
  p_expires_at timestamptz default null,
  p_max_uses integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.users%rowtype;
  normalized_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  result_id uuid;
begin
  select * into actor from public.users where id = auth.uid();
  if not found or actor.role <> 'ADMIN' or actor.school_id is null then
    raise exception 'Administrateur d''établissement requis';
  end if;
  if length(normalized_code) < 8 then raise exception 'Le code doit contenir au moins 8 caractères'; end if;
  if not p_allowed_roles <@ array['ADMIN', 'TEACHER', 'PARENT']::text[] then raise exception 'Rôle non autorisé'; end if;

  insert into public.school_join_codes (school_id, code_hash, allowed_roles, expires_at, max_uses, created_by)
  values (actor.school_id, encode(digest(normalized_code, 'sha256'), 'hex'), p_allowed_roles, p_expires_at, p_max_uses, auth.uid())
  returning id into result_id;
  return result_id;
end;
$$;

revoke all on function public.create_school_join_code(text, text[], timestamptz, integer) from public;
grant execute on function public.create_school_join_code(text, text[], timestamptz, integer) to authenticated;
