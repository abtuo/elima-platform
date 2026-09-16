-- Extensions for scripts/seed.ts (ERP eLIMA fictitious data).
-- Idempotent: safe to re-run.

-- Schools: branding & billing
alter table public.schools add column if not exists motto text;
alter table public.schools add column if not exists plan text;
alter table public.schools add column if not exists logo_url text;
alter table public.schools add column if not exists currency text;

-- Classes
alter table public.classes add column if not exists capacity integer;

-- Students (denormalized guardian fields for ERP / WhatsApp)
alter table public.students add column if not exists first_name text;
alter table public.students add column if not exists last_name text;
alter table public.students add column if not exists gender text;
alter table public.students add column if not exists status text not null default 'active';
alter table public.students add column if not exists parent_name text;
alter table public.students add column if not exists parent_phone text;
alter table public.students add column if not exists parent_email text;

-- Attendance
alter table public.attendance add column if not exists justified boolean not null default false;

-- Evaluations: type label for reporting
alter table public.evaluations add column if not exists evaluation_type text;

-- Teachers: primary teaching subject (display; subjects still normalized)
alter table public.teachers add column if not exists primary_subject text;

-- Payments (inscription / scolarité)
create table if not exists public.student_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  parent_phone text,
  amount numeric(12,2) not null,
  type text not null check (type in ('inscription', 'scolarite')),
  provider text not null check (provider in ('Wave', 'Orange Money', 'MTN Money')),
  status text not null check (status in ('paid', 'pending', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_student_payments_school on public.student_payments(school_id);
create index if not exists idx_student_payments_student on public.student_payments(student_id);

-- WhatsApp-style outbound messages (not the generic notifications table)
create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  parent_phone text,
  message_type text not null check (
    message_type in (
      'grade_notification',
      'absence_alert',
      'payment_reminder',
      'admin_info',
      'ai_summary'
    )
  ),
  body text not null,
  status text not null check (status in ('sent', 'delivered', 'read')),
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_messages_school on public.whatsapp_messages(school_id);

-- Future link to external revision app (no quiz content here)
create table if not exists public.student_learning_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  weak_subjects text[] not null default '{}',
  strong_subjects text[] not null default '{}',
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  attendance_risk_score numeric(6,2) not null default 0,
  academic_risk_score numeric(6,2) not null default 0,
  suggested_focus_areas text[] not null default '{}',
  last_computed_at timestamptz not null default now(),
  unique (student_id)
);

create index if not exists idx_student_learning_profiles_school on public.student_learning_profiles(school_id);

-- Internal AI-style insights (ERP only)
create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  type text not null check (
    type in ('academic_risk', 'attendance_risk', 'payment_risk', 'progress_summary')
  ),
  title text not null,
  description text not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_insights_school on public.ai_insights(school_id);
create index if not exists idx_ai_insights_student on public.ai_insights(student_id);

alter table public.student_payments enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.student_learning_profiles enable row level security;
alter table public.ai_insights enable row level security;
