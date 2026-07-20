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

create index if not exists idx_auth_verification_ip_created
  on public.auth_verification_challenges(requested_ip_hash, created_at desc)
  where requested_ip_hash is not null;

alter table public.auth_verification_challenges enable row level security;
revoke all on public.auth_verification_challenges from anon, authenticated;
