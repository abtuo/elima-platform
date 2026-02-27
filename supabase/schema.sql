-- Elima MVP - Supabase/PostgreSQL schema
-- Multi-tenant by school with strict RBAC-ready structure.

create extension if not exists pgcrypto;

create type public.app_role as enum (
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'TEACHER',
  'PARENT',
  'STUDENT'
);

create type public.attendance_status as enum ('PRESENT', 'ABSENT', 'LATE');
create type public.notification_status as enum ('PENDING', 'SENT', 'FAILED');
create type public.risk_level as enum ('LOW', 'MEDIUM', 'HIGH');

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  city text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  role public.app_role not null,
  full_name text not null,
  phone text,
  created_at timestamptz not null default now()
);

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

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null unique references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.parents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null unique references public.users(id) on delete cascade,
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
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  score numeric(6,2) not null,
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

create index if not exists idx_users_school_role on public.users(school_id, role);
create index if not exists idx_students_school_class on public.students(school_id, class_id);
create index if not exists idx_attendance_student_date on public.attendance(student_id, date);
create index if not exists idx_grades_student on public.grades(student_id);
create index if not exists idx_notifications_status on public.notifications(status);
create index if not exists idx_academic_metrics_student on public.academic_metrics(student_id, computed_at desc);

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
alter table public.attendance enable row level security;
alter table public.evaluations enable row level security;
alter table public.grades enable row level security;
alter table public.academic_metrics enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;

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
