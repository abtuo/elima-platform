create table if not exists public.school_registration_requests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  contact_identifier text not null,
  school_name text not null,
  school_city text not null,
  job_title text,
  estimated_student_count integer check (estimated_student_count is null or estimated_student_count > 0),
  source text not null default 'app.elima.ci',
  status text not null default 'pending' check (status in ('pending', 'contacted', 'approved', 'rejected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_school_registration_requests_status_created
  on public.school_registration_requests(status, created_at desc);

alter table public.school_registration_requests enable row level security;
revoke all on table public.school_registration_requests from anon, authenticated;

comment on table public.school_registration_requests is
  'Demandes de création d’établissement reçues depuis l’accueil public de l’application.';
