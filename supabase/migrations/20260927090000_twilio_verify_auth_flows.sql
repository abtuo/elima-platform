create extension if not exists pgcrypto;

create table if not exists public.auth_flow_attempts (
  id uuid primary key default gen_random_uuid(),
  phone_hash text not null,
  ip_hash text,
  action text not null check (action in ('otp_request', 'otp_check', 'password_reset')),
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_flow_attempts_phone
  on public.auth_flow_attempts(phone_hash, action, created_at desc);
create index if not exists idx_auth_flow_attempts_ip
  on public.auth_flow_attempts(ip_hash, action, created_at desc)
  where ip_hash is not null;

create table if not exists public.auth_flow_authorizations (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  phone text not null,
  phone_hash text not null,
  purpose text not null check (purpose in ('otp_signup', 'otp_password_reset', 'phone_control', 'signup', 'password_reset')),
  expires_at timestamptz not null,
  claimed_at timestamptz,
  claim_id uuid,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint auth_flow_claim_pair check ((claimed_at is null) = (claim_id is null))
);

create index if not exists idx_auth_flow_authorizations_expiry
  on public.auth_flow_authorizations(expires_at);
create index if not exists idx_auth_flow_authorizations_phone
  on public.auth_flow_authorizations(phone_hash, purpose, created_at desc);

alter table public.auth_flow_attempts enable row level security;
alter table public.auth_flow_authorizations enable row level security;

revoke all on table public.auth_flow_attempts from public, anon, authenticated;
revoke all on table public.auth_flow_authorizations from public, anon, authenticated;
grant all on table public.auth_flow_attempts to service_role;
grant all on table public.auth_flow_authorizations to service_role;
