-- Comptes élèves autonomes et rattachement facultatif à un établissement.
-- Les codes sont individuels, stockés sous forme de hash et consommés par une RPC.

create extension if not exists pgcrypto;

alter table public.student_profiles
  add column if not exists school_membership_status text not null default 'standalone',
  add column if not exists declared_school_name text,
  add column if not exists declared_school_city text,
  add column if not exists linked_student_id uuid references public.students(id) on delete set null,
  add column if not exists linked_at timestamptz;

alter table public.student_profiles
  drop constraint if exists student_profiles_school_membership_status_check;
alter table public.student_profiles
  add constraint student_profiles_school_membership_status_check
  check (school_membership_status in ('standalone', 'linked'));

-- Compatibilité avec les élèves déjà rattachés avant cette migration.
update public.student_profiles as sp
set school_membership_status = 'linked',
    linked_student_id = coalesce(sp.linked_student_id, (
      select s.id from public.students as s where s.user_id = sp.id limit 1
    )),
    linked_at = coalesce(sp.linked_at, now())
from public.users as u
where u.id = sp.id and u.school_id is not null;

create table if not exists public.student_activation_codes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint student_activation_codes_single_use check (used_at is null or used_by is not null)
);

create unique index if not exists uq_student_activation_codes_available_student
  on public.student_activation_codes(student_id)
  where used_at is null and revoked_at is null;
create index if not exists idx_student_activation_codes_school
  on public.student_activation_codes(school_id, created_at desc);

alter table public.student_activation_codes enable row level security;

-- Les codes ne sont jamais lisibles depuis le client. Leur création sera branchée
-- plus tard sur l'administration elima.ci via service role ou une RPC dédiée admin.
revoke all on table public.student_activation_codes from anon, authenticated;

create or replace function public.initialize_standalone_student_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if upper(coalesce(meta->>'role', '')) = 'STUDENT' then
    insert into public.student_profiles (
      id,
      first_name,
      last_name,
      school_level_id,
      declared_school_name,
      declared_school_city,
      school_membership_status,
      cgu_accepted_at,
      cgu_version
    ) values (
      new.id,
      coalesce(nullif(btrim(meta->>'first_name'), ''), split_part(coalesce(meta->>'full_name', ''), ' ', 1)),
      coalesce(nullif(btrim(meta->>'last_name'), ''), btrim(regexp_replace(coalesce(meta->>'full_name', ''), '^\S+\s*', ''))),
      coalesce(nullif(btrim(meta->>'school_level_id'), ''), ''),
      nullif(btrim(meta->>'declared_school_name'), ''),
      nullif(btrim(meta->>'declared_school_city'), ''),
      'standalone',
      case when coalesce((meta->>'cgu_accepted')::boolean, false) then now() else null end,
      nullif(meta->>'cgu_version', '')
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_student_profile_created on auth.users;
create trigger on_auth_student_profile_created
after insert on auth.users
for each row execute function public.initialize_standalone_student_profile();

create or replace function public.activate_student_school_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  normalized_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  activation public.student_activation_codes%rowtype;
  actor public.users%rowtype;
  school_name text;
begin
  if actor_id is null then raise exception 'Authentification requise'; end if;
  if length(normalized_code) < 6 then raise exception 'Code invalide'; end if;

  select * into actor from public.users where id = actor_id for update;
  if not found or actor.role <> 'STUDENT' then raise exception 'Compte élève requis'; end if;

  select * into activation
  from public.student_activation_codes
  where code_hash = encode(digest(normalized_code, 'sha256'), 'hex')
  for update;

  if not found
    or activation.revoked_at is not null
    or activation.used_at is not null
    or (activation.expires_at is not null and activation.expires_at <= now()) then
    raise exception 'Code invalide ou expiré';
  end if;

  if actor.school_id is not null and actor.school_id <> activation.school_id then
    raise exception 'Ce compte est déjà rattaché à un autre établissement';
  end if;

  if exists (
    select 1 from public.students
    where id = activation.student_id
      and user_id is not null
      and user_id <> actor_id
  ) then
    raise exception 'Ce code a déjà été associé à un autre compte';
  end if;

  update public.users set school_id = activation.school_id where id = actor_id;
  update public.students set user_id = actor_id where id = activation.student_id;
  update public.student_profiles
  set school_membership_status = 'linked',
      linked_student_id = activation.student_id,
      linked_at = now(),
      updated_at = now()
  where id = actor_id;
  update public.student_activation_codes
  set used_at = now(), used_by = actor_id
  where id = activation.id;

  select name into school_name from public.schools where id = activation.school_id;
  return jsonb_build_object(
    'ok', true,
    'school_id', activation.school_id,
    'school_name', school_name,
    'student_id', activation.student_id
  );
end;
$$;

revoke all on function public.activate_student_school_code(text) from public;
grant execute on function public.activate_student_school_code(text) to authenticated;

-- Fonction réservée aux outils serveur/admin pour générer un code lisible une seule fois.
create or replace function public.create_student_activation_code(
  p_student_id uuid,
  p_expires_at timestamptz default (now() + interval '30 days')
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_code text;
  target_school_id uuid;
begin
  select school_id into target_school_id from public.students where id = p_student_id;
  if target_school_id is null then raise exception 'Élève introuvable'; end if;

  update public.student_activation_codes
  set revoked_at = now()
  where student_id = p_student_id and used_at is null and revoked_at is null;

  generated_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 4) || '-' || substr(encode(gen_random_bytes(8), 'hex'), 1, 4));
  insert into public.student_activation_codes(school_id, student_id, code_hash, expires_at, created_by)
  values (target_school_id, p_student_id, encode(digest(replace(generated_code, '-', ''), 'sha256'), 'hex'), p_expires_at, auth.uid());
  return generated_code;
end;
$$;

revoke all on function public.create_student_activation_code(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.create_student_activation_code(uuid, timestamptz) to service_role;
