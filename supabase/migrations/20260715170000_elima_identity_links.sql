create table if not exists public.identity_links (
  id uuid primary key default gen_random_uuid(),
  local_user_id uuid not null unique references auth.users(id) on delete cascade,
  issuer text not null,
  external_subject text not null,
  external_school_id uuid,
  external_student_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (issuer, external_subject)
);
create index if not exists idx_identity_links_external_school on public.identity_links(external_school_id);
alter table public.identity_links enable row level security;
drop policy if exists identity_links_read_own on public.identity_links;
create policy identity_links_read_own on public.identity_links for select to authenticated using (local_user_id = auth.uid());
revoke insert, update, delete on public.identity_links from anon, authenticated;
