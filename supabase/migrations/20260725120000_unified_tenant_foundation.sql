create extension if not exists pgcrypto;

create table if not exists public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.app_role not null,
  status text not null default 'active' check (status in ('invited', 'active', 'suspended', 'left')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, user_id, role)
);

create index if not exists idx_school_memberships_user
  on public.school_memberships(user_id, status);
create index if not exists idx_school_memberships_tenant
  on public.school_memberships(school_id, status, role);

insert into public.school_memberships (school_id, user_id, role, status, is_primary)
select school_id, id, role, 'active', true
from public.users
where school_id is not null
on conflict (school_id, user_id, role) do update
set status = 'active', is_primary = true, updated_at = now();

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  academic_year text not null,
  status text not null default 'active' check (status in ('pending', 'active', 'completed', 'withdrawn')),
  enrolled_at date not null default current_date,
  ended_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, academic_year)
);

create index if not exists idx_enrollments_tenant_class
  on public.enrollments(school_id, class_id, status);
create index if not exists idx_enrollments_student
  on public.enrollments(student_id, status);

insert into public.enrollments (school_id, student_id, class_id, academic_year, status)
select s.school_id, s.id, s.class_id, coalesce(c.academic_year, 'legacy'), 'active'
from public.students s
join public.classes c on c.id = s.class_id
where s.class_id is not null
on conflict (student_id, academic_year) do update
set class_id = excluded.class_id, status = 'active', updated_at = now();

create table if not exists public.school_features (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default false,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, feature_key)
);

create index if not exists idx_school_features_tenant
  on public.school_features(school_id, enabled, feature_key);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  title text not null,
  document_type text not null default 'other',
  storage_path text not null,
  audience text not null default 'all' check (audience in ('all', 'staff', 'parents', 'students', 'private')),
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_tenant_created
  on public.documents(school_id, created_at desc);
create index if not exists idx_documents_student
  on public.documents(student_id) where student_id is not null;
create index if not exists idx_documents_class
  on public.documents(class_id) where class_id is not null;

create table if not exists public.student_prospects (
  user_id uuid primary key references auth.users(id) on delete cascade,
  declared_school_name text,
  declared_school_city text,
  school_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_join_codes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  code_hash text not null unique,
  allowed_roles text[] not null default array['SCHOOL_ADMIN', 'TEACHER', 'PARENT']::text[],
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_school_join_codes_school_active
  on public.school_join_codes(school_id, active, created_at desc);

create table if not exists public.auth_verification_challenges (
  id uuid primary key,
  purpose text not null check (purpose in ('signup', 'password_reset')),
  identifier_hash text not null,
  phone_hash text not null,
  code_hash text not null,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  requested_ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_verification_identifier_created
  on public.auth_verification_challenges(identifier_hash, created_at desc);
create index if not exists idx_auth_verification_phone_created
  on public.auth_verification_challenges(phone_hash, created_at desc);
create index if not exists idx_auth_verification_expiry
  on public.auth_verification_challenges(expires_at);

alter table public.school_memberships enable row level security;
alter table public.enrollments enable row level security;
alter table public.school_features enable row level security;
alter table public.documents enable row level security;
alter table public.student_prospects enable row level security;
alter table public.school_join_codes enable row level security;
alter table public.auth_verification_challenges enable row level security;

drop policy if exists school_memberships_read_own on public.school_memberships;
create policy school_memberships_read_own
on public.school_memberships for select to authenticated
using (user_id = auth.uid());

drop policy if exists school_memberships_admin_manage on public.school_memberships;
create policy school_memberships_admin_manage
on public.school_memberships for all to authenticated
using (
  exists (
    select 1 from public.users actor
    where actor.id = auth.uid()
      and actor.school_id = school_memberships.school_id
      and actor.role in ('SCHOOL_ADMIN', 'SUPER_ADMIN')
  )
)
with check (
  exists (
    select 1 from public.users actor
    where actor.id = auth.uid()
      and actor.school_id = school_memberships.school_id
      and actor.role in ('SCHOOL_ADMIN', 'SUPER_ADMIN')
  )
);

drop policy if exists enrollments_read_authorized on public.enrollments;
create policy enrollments_read_authorized
on public.enrollments for select to authenticated
using (
  public.user_can_access_student(student_id)
  or public.user_can_access_class(class_id)
);

drop policy if exists enrollments_admin_manage on public.enrollments;
create policy enrollments_admin_manage
on public.enrollments for all to authenticated
using (
  school_id = public.current_user_school_id()
  and public.current_user_role() in ('SCHOOL_ADMIN', 'SUPER_ADMIN')
)
with check (
  school_id = public.current_user_school_id()
  and public.current_user_role() in ('SCHOOL_ADMIN', 'SUPER_ADMIN')
);

drop policy if exists school_features_read_tenant on public.school_features;
create policy school_features_read_tenant
on public.school_features for select to authenticated
using (school_id = public.current_user_school_id());

drop policy if exists school_features_admin_manage on public.school_features;
create policy school_features_admin_manage
on public.school_features for all to authenticated
using (
  school_id = public.current_user_school_id()
  and public.current_user_role() in ('SCHOOL_ADMIN', 'SUPER_ADMIN')
)
with check (
  school_id = public.current_user_school_id()
  and public.current_user_role() in ('SCHOOL_ADMIN', 'SUPER_ADMIN')
);

drop policy if exists documents_read_authorized on public.documents;
create policy documents_read_authorized
on public.documents for select to authenticated
using (
  school_id = public.current_user_school_id()
  and (
    audience = 'all'
    or (audience = 'staff' and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'COMPTABLE', 'TEACHER'))
    or (audience = 'parents' and public.current_user_role() = 'PARENT')
    or (audience = 'students' and public.current_user_role() = 'STUDENT')
    or (student_id is not null and public.user_can_access_student(student_id))
    or (class_id is not null and public.user_can_access_class(class_id))
  )
);

drop policy if exists documents_staff_manage on public.documents;
create policy documents_staff_manage
on public.documents for all to authenticated
using (
  school_id = public.current_user_school_id()
  and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER')
)
with check (
  school_id = public.current_user_school_id()
  and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER')
);

drop policy if exists student_prospects_read_own on public.student_prospects;
drop policy if exists student_prospects_update_own on public.student_prospects;
create policy student_prospects_read_own
on public.student_prospects for select to authenticated using (user_id = auth.uid());
create policy student_prospects_update_own
on public.student_prospects for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on table public.school_join_codes from anon, authenticated;
revoke all on table public.auth_verification_challenges from anon, authenticated;

create or replace function public.create_school_join_code(
  p_code text,
  p_allowed_roles text[] default array['SCHOOL_ADMIN', 'TEACHER', 'PARENT']::text[],
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
  if not found or actor.role not in ('SCHOOL_ADMIN', 'SUPER_ADMIN') or actor.school_id is null then
    raise exception 'Administrateur d''établissement requis';
  end if;
  if length(normalized_code) < 8 then
    raise exception 'Le code doit contenir au moins 8 caractères';
  end if;
  if not p_allowed_roles <@ array['SCHOOL_ADMIN', 'TEACHER', 'PARENT']::text[] then
    raise exception 'Rôle non autorisé';
  end if;

  insert into public.school_join_codes (
    school_id, code_hash, allowed_roles, expires_at, max_uses, created_by
  )
  values (
    actor.school_id,
    encode(digest(normalized_code, 'sha256'), 'hex'),
    p_allowed_roles,
    p_expires_at,
    p_max_uses,
    auth.uid()
  )
  returning id into result_id;
  return result_id;
end;
$$;

revoke all on function public.create_school_join_code(text, text[], timestamptz, integer) from public;
grant execute on function public.create_school_join_code(text, text[], timestamptz, integer) to authenticated;

insert into storage.buckets (id, name, public)
values
  ('documents', 'documents', false),
  ('elima-files', 'elima-files', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Tenant members read school documents" on storage.objects;
create policy "Tenant members read school documents"
on storage.objects for select to authenticated
using (
  bucket_id in ('documents', 'elima-files')
  and (storage.foldername(name))[1] = public.current_user_school_id()::text
);

drop policy if exists "Tenant staff create school documents" on storage.objects;
create policy "Tenant staff create school documents"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('documents', 'elima-files')
  and (storage.foldername(name))[1] = public.current_user_school_id()::text
  and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER')
);

drop policy if exists "Tenant staff update school documents" on storage.objects;
create policy "Tenant staff update school documents"
on storage.objects for update to authenticated
using (
  bucket_id in ('documents', 'elima-files')
  and (storage.foldername(name))[1] = public.current_user_school_id()::text
  and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER')
)
with check (
  bucket_id in ('documents', 'elima-files')
  and (storage.foldername(name))[1] = public.current_user_school_id()::text
  and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER')
);

drop policy if exists "Tenant admins delete school documents" on storage.objects;
create policy "Tenant admins delete school documents"
on storage.objects for delete to authenticated
using (
  bucket_id in ('documents', 'elima-files')
  and (storage.foldername(name))[1] = public.current_user_school_id()::text
  and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN')
);
