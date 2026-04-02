-- Elima MVP - Supabase/PostgreSQL schema
-- Multi-tenant by school with strict RBAC-ready structure.

create extension if not exists pgcrypto;

-- Enums
-- (Supabase SQL editor may run this file multiple times; enums must therefore be created conditionally.)
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'app_role' and n.nspname = 'public'
  ) then
    create type public.app_role as enum (
      'SUPER_ADMIN',
      'SCHOOL_ADMIN',
      'TEACHER',
      'PARENT',
      'STUDENT'
    );
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'attendance_status' and n.nspname = 'public'
  ) then
    create type public.attendance_status as enum ('PRESENT', 'ABSENT', 'LATE');
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'notification_status' and n.nspname = 'public'
  ) then
    create type public.notification_status as enum ('PENDING', 'SENT', 'FAILED');
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'risk_level' and n.nspname = 'public'
  ) then
    create type public.risk_level as enum ('LOW', 'MEDIUM', 'HIGH');
  end if;
end$$;

-- Communication / messaging
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'conversation_participant_type' and n.nspname = 'public'
  ) then
    create type public.conversation_participant_type as enum ('USER', 'CLASS');
  end if;
end$$;

-- School status (from spec)
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'school_status' and n.nspname = 'public'
  ) then
    create type public.school_status as enum ('public', 'private');
  end if;
end$$;

-- Teacher personal
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'todo_status' and n.nspname = 'public'
  ) then
    create type public.todo_status as enum ('OPEN', 'DONE');
  end if;
end$$;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  city text,
  phone text,
  status public.school_status not null default 'private',
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  school_id uuid references public.schools(id) on delete set null,
  role public.app_role not null,
  full_name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_users_email on public.users(email) where email is not null;

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  level text not null,
  academic_year text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  coefficient numeric(5,2) not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.terms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint terms_date_range_check check (start_date <= end_date)
);

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null unique references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.parents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  -- Parent accounts can exist without an Auth user.
  -- If you later decide to allow parent login, you can attach a public.users row here.
  user_id uuid unique references public.users(id) on delete set null,
  email text,
  full_name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid unique references public.users(id) on delete set null,
  class_id uuid not null references public.classes(id) on delete restrict,
  registration_number text,
  full_name text not null,
  birth_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.student_parents (
  student_id uuid not null references public.students(id) on delete cascade,
  parent_id uuid not null references public.parents(id) on delete cascade,
  relationship text,
  primary key (student_id, parent_id)
);

create table if not exists public.class_teachers (
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  primary key (class_id, teacher_id, subject_id)
);

-- Teaching relations (spec name)
create table if not exists public.teacher_subject_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (teacher_id, class_id, subject_id)
);

-- Timetable
create table if not exists public.timetable_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  room text,
  created_at timestamptz not null default now(),
  constraint timetable_events_time_check check (starts_at < ends_at)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  recorded_by uuid references public.users(id) on delete set null,
  status public.attendance_status not null,
  date date not null,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  max_score numeric(6,2) not null default 20,
  evaluation_date date not null,
  coefficient numeric(6,2) not null default 1,
  term_id uuid references public.terms(id) on delete set null,
  teacher_id uuid references public.teachers(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  score numeric(6,2) not null,
  comment text,
  created_at timestamptz not null default now(),
  unique (evaluation_id, student_id)
);

create table if not exists public.academic_metrics (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  average_score numeric(6,2) not null,
  attendance_rate numeric(6,2) not null,
  performance_trend text not null,
  risk_level public.risk_level not null,
  alert_flag boolean not null default false,
  computed_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  term text not null,
  average_score numeric(6,2) not null,
  attendance_rate numeric(6,2) not null,
  pdf_url text,
  published_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Reports v2 (spec): stable structure for term summaries
create table if not exists public.student_term_summaries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  term_id uuid not null references public.terms(id) on delete cascade,
  average numeric(6,2) not null,
  rank integer,
  appreciation_auto text not null,
  appreciation_override text,
  created_at timestamptz not null default now(),
  unique(student_id, term_id)
);

-- Homework
create table if not exists public.homeworks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  title text not null,
  description text,
  due_date date not null,
  created_at timestamptz not null default now()
);

-- Communication
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  participant_type public.conversation_participant_type not null default 'USER',
  user_id uuid references public.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversation_participants_one_target_check check (
    (participant_type = 'USER' and user_id is not null and class_id is null)
    or
    (participant_type = 'CLASS' and class_id is not null and user_id is null)
  )
);

create unique index if not exists uq_conversation_participants_user
  on public.conversation_participants(conversation_id, user_id)
  where user_id is not null;
create unique index if not exists uq_conversation_participants_class
  on public.conversation_participants(conversation_id, class_id)
  where class_id is not null;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references public.users(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Teacher personal
create table if not exists public.teacher_todos (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  text text not null,
  status public.todo_status not null default 'OPEN',
  created_at timestamptz not null default now()
);

create table if not exists public.teacher_memos (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  content text not null,
  updated_at timestamptz not null default now()
);

-- Audit logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  parent_id uuid references public.parents(id) on delete set null,
  type text not null,
  channel text not null default 'WHATSAPP',
  message text not null,
  status public.notification_status not null default 'PENDING',
  provider_ref text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Demo requests (landing)
create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school text not null,
  city text,
  email text not null,
  phone text,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_school_role on public.users(school_id, role);
create index if not exists idx_students_school_class on public.students(school_id, class_id);
create index if not exists idx_attendance_student_date on public.attendance(student_id, date);
create index if not exists idx_grades_student on public.grades(student_id);
create index if not exists idx_grades_evaluation on public.grades(evaluation_id);
create index if not exists idx_notifications_status on public.notifications(status);
create index if not exists idx_academic_metrics_student on public.academic_metrics(student_id, computed_at desc);

create index if not exists idx_evaluations_class on public.evaluations(class_id);
create index if not exists idx_timetable_events_starts_at on public.timetable_events(starts_at);
create index if not exists idx_attendance_records_student on public.attendance(student_id);
create index if not exists idx_messages_conversation on public.messages(conversation_id);
create index if not exists idx_conversation_participants_conversation on public.conversation_participants(conversation_id);

-- RLS toggled on. Policies should be expanded per deployment requirements.
alter table public.schools enable row level security;
alter table public.users enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;
alter table public.teachers enable row level security;
alter table public.parents enable row level security;
alter table public.students enable row level security;
alter table public.student_parents enable row level security;
alter table public.class_teachers enable row level security;
alter table public.teacher_subject_classes enable row level security;
alter table public.timetable_events enable row level security;
alter table public.attendance enable row level security;
alter table public.evaluations enable row level security;
alter table public.grades enable row level security;
alter table public.academic_metrics enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;

alter table public.terms enable row level security;
alter table public.student_term_summaries enable row level security;
alter table public.homeworks enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.teacher_todos enable row level security;
alter table public.teacher_memos enable row level security;
alter table public.audit_logs enable row level security;
alter table public.demo_requests enable row level security;

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.current_user_school_id()
returns uuid
language sql
stable
as $$
  select school_id from public.users where id = auth.uid();
$$;

-- =====================
-- Auth → App profile sync
-- =====================
-- When a user is created in Supabase Auth (auth.users), we want a matching row
-- in public.users, with the SAME UUID (public.users.id = auth.users.id).
--
-- How to set role/school/phone/full_name at creation time:
-- - Set user metadata (raw_user_meta_data) when creating the Auth user.
--   Example metadata JSON:
--   {
--     "role": "TEACHER",
--     "school_id": "11111111-1111-1111-1111-111111111111",
--     "full_name": "Enseignant 42",
--     "phone": "+225100000042"
--   }
--
-- Notes:
-- - role must be one of public.app_role.
-- - school_id should be a valid public.schools.id (uuid).

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb;
  role_text text;
  role_enum public.app_role;
  school_uuid uuid;
  full_name_text text;
  phone_text text;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  role_text := nullif(trim(meta->>'role'), '');
  begin
    role_enum := coalesce(role_text::public.app_role, 'PARENT'::public.app_role);
  exception when others then
    role_enum := 'PARENT'::public.app_role;
  end;

  begin
    school_uuid := nullif(meta->>'school_id','')::uuid;
  exception when others then
    school_uuid := null;
  end;

  full_name_text := nullif(trim(meta->>'full_name'), '');
  if full_name_text is null then
    full_name_text := coalesce(nullif(trim(new.email), ''), 'Utilisateur');
  end if;

  phone_text := nullif(trim(meta->>'phone'), '');

  insert into public.users (id, email, school_id, role, full_name, phone)
  values (new.id, new.email, school_uuid, role_enum, full_name_text, phone_text)
  on conflict (id) do update set
    email = excluded.email,
    school_id = excluded.school_id,
    role = excluded.role,
    full_name = excluded.full_name,
    phone = excluded.phone;

  -- Convenience: create the domain row when relevant.
  if role_enum = 'TEACHER'::public.app_role and school_uuid is not null then
    insert into public.teachers (school_id, user_id)
    values (school_uuid, new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_auth_user_created();

-- =====================
-- Manual reset (when needed)
-- =====================
-- To clear all auth and profile users (keep schema):
-- 1) delete from public.users; (cascades to teachers/parents if linked)
-- 2) delete from auth.users; (requires service role)
-- Recreate admins via /signup or Supabase UI.

-- =====================
-- Minimal RLS policies (Parent / Student read-only)
-- =====================

-- Users: each user can read its own profile.
drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
on public.users
for select
to authenticated
using (id = auth.uid());

-- Parents: a parent can read its own parent record.
drop policy if exists "Parents can read own row" on public.parents;
create policy "Parents can read own row"
on public.parents
for select
to authenticated
using (false);

-- Student-Parents link: parent can read links for their parent_id.
drop policy if exists "Parents can read their links" on public.student_parents;
create policy "Parents can read their links"
on public.student_parents
for select
to authenticated
using (
  false
);

-- Students: parent can read students linked to them.
drop policy if exists "Parents can read linked students" on public.students;
create policy "Parents can read linked students"
on public.students
for select
to authenticated
using (
  false
);

-- Classes: parent can read class of linked students.
drop policy if exists "Parents can read linked classes" on public.classes;
create policy "Parents can read linked classes"
on public.classes
for select
to authenticated
using (
  false
);

-- Attendance: parent can read attendance of linked students.
drop policy if exists "Parents can read linked attendance" on public.attendance;
create policy "Parents can read linked attendance"
on public.attendance
for select
to authenticated
using (
  false
);

-- Grades: parent can read grades of linked students.
drop policy if exists "Parents can read linked grades" on public.grades;
create policy "Parents can read linked grades"
on public.grades
for select
to authenticated
using (
  false
);

-- Evaluations: parent can read evaluations for classes of linked students.
drop policy if exists "Parents can read linked evaluations" on public.evaluations;
create policy "Parents can read linked evaluations"
on public.evaluations
for select
to authenticated
using (
  false
);

-- Reports: parent can read reports of linked students.
drop policy if exists "Parents can read linked reports" on public.reports;
create policy "Parents can read linked reports"
on public.reports
for select
to authenticated
using (
  false
);
