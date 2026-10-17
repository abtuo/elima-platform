create table if not exists public.pedagogical_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  request jsonb not null check (jsonb_typeof(request) = 'object'),
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  prompt_version text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'failed', 'succeeded', 'cancelled')),
  current_step text not null default 'plan' check (current_step in ('plan', 'content', 'exercises', 'corrections', 'validate', 'persist')),
  artifacts jsonb not null default '{}'::jsonb check (jsonb_typeof(artifacts) = 'object'),
  error jsonb,
  attempts integer not null default 0 check (attempts between 0 and 3),
  max_attempts integer not null default 3 check (max_attempts between 1 and 3),
  ai_calls integer not null default 0 check (ai_calls between 0 and 10),
  lock_version bigint not null default 1 check (lock_version > 0),
  result_resource_id uuid references public.pedagogical_resources(id) on delete set null,
  result_version_id uuid references public.pedagogical_resource_versions(id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (school_id, created_by_user_id, idempotency_key)
);

create table if not exists public.pedagogical_generation_usage (
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  usage_date date not null default current_date,
  jobs integer not null default 0 check (jobs >= 0),
  ai_calls integer not null default 0 check (ai_calls >= 0),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  estimated_cost numeric(14,6),
  updated_at timestamptz not null default now(),
  primary key (school_id, user_id, usage_date)
);

create table if not exists public.pedagogical_ai_events (
  id bigint generated always as identity primary key,
  generation_id uuid not null references public.pedagogical_generation_jobs(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  step text not null,
  status text not null check (status in ('succeeded', 'failed')),
  model text,
  deployment text,
  prompt_version text not null,
  response_mode text,
  calls integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  duration_ms integer not null default 0,
  estimated_cost numeric(14,6),
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists idx_pedagogical_generation_owner on public.pedagogical_generation_jobs(school_id, created_by_user_id, created_at desc);
create index if not exists idx_pedagogical_generation_runnable on public.pedagogical_generation_jobs(status, updated_at) where status in ('queued', 'running');
create index if not exists idx_pedagogical_ai_events_generation on public.pedagogical_ai_events(generation_id, created_at);

create or replace function public.reserve_pedagogical_generation_job(p_school_id uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare user_jobs integer; school_jobs integer;
begin
  insert into public.pedagogical_generation_usage(school_id, user_id, usage_date)
  values (p_school_id, p_user_id, current_date) on conflict do nothing;
  select jobs into user_jobs from public.pedagogical_generation_usage
  where school_id = p_school_id and user_id = p_user_id and usage_date = current_date for update;
  select coalesce(sum(jobs), 0) into school_jobs from public.pedagogical_generation_usage
  where school_id = p_school_id and usage_date = current_date;
  if user_jobs >= 10 or school_jobs >= 100 then return false; end if;
  update public.pedagogical_generation_usage set jobs = jobs + 1, updated_at = now()
  where school_id = p_school_id and user_id = p_user_id and usage_date = current_date;
  return true;
end;
$$;

create or replace function public.reserve_pedagogical_generation_call(p_generation_id uuid, p_school_id uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_calls integer;
begin
  update public.pedagogical_generation_jobs set ai_calls = ai_calls + 1, updated_at = now()
  where id = p_generation_id and school_id = p_school_id and created_by_user_id = p_user_id
    and status = 'running' and ai_calls < 10 returning ai_calls into current_calls;
  if current_calls is null then return false; end if;
  update public.pedagogical_generation_usage set ai_calls = ai_calls + 1, updated_at = now()
  where school_id = p_school_id and user_id = p_user_id and usage_date = current_date and ai_calls < 80;
  if not found then raise exception 'Pedagogical generation daily call quota exceeded' using errcode = '54000'; end if;
  return true;
end;
$$;

create or replace function public.complete_pedagogical_generation_step(
  p_generation_id uuid, p_expected_lock bigint, p_step text, p_next_step text,
  p_artifact jsonb, p_telemetry jsonb, p_duration_ms integer, p_completed_at timestamptz, p_succeeded boolean
) returns public.pedagogical_generation_jobs
language plpgsql security definer set search_path = public as $$
declare result public.pedagogical_generation_jobs; in_tokens integer; out_tokens integer; cost numeric;
begin
  in_tokens := coalesce((p_telemetry #>> '{usage,inputTokens}')::integer, 0);
  out_tokens := coalesce((p_telemetry #>> '{usage,outputTokens}')::integer, 0);
  cost := nullif(p_telemetry ->> 'estimatedCost', '')::numeric;
  update public.pedagogical_generation_jobs set
    artifacts = jsonb_set(artifacts, array[p_step], p_artifact, true),
    current_step = coalesce(p_next_step, current_step), status = case when p_succeeded then 'succeeded' else 'running' end,
    result_resource_id = case when p_succeeded then (p_artifact ->> 'resourceId')::uuid else result_resource_id end,
    result_version_id = case when p_succeeded then (p_artifact ->> 'versionId')::uuid else result_version_id end,
    completed_at = case when p_succeeded then p_completed_at else completed_at end,
    error = null, lock_version = lock_version + 1, updated_at = p_completed_at
  where id = p_generation_id and lock_version = p_expected_lock and status = 'running' and current_step = p_step
  returning * into result;
  if result.id is null then return null; end if;
  insert into public.pedagogical_ai_events(generation_id, school_id, user_id, step, status, model, deployment, prompt_version, response_mode, calls, input_tokens, output_tokens, duration_ms, estimated_cost)
  values (result.id, result.school_id, result.created_by_user_id, p_step, 'succeeded', p_telemetry->>'model', p_telemetry->>'deployment', result.prompt_version, p_telemetry->>'responseMode', coalesce((p_telemetry->>'calls')::integer,0), in_tokens, out_tokens, p_duration_ms, cost);
  update public.pedagogical_generation_usage set input_tokens = input_tokens + in_tokens, output_tokens = output_tokens + out_tokens,
    estimated_cost = case when cost is null then estimated_cost else coalesce(estimated_cost,0) + cost end, updated_at = now()
  where school_id = result.school_id and user_id = result.created_by_user_id and usage_date = current_date;
  return result;
end;
$$;

create or replace function public.fail_pedagogical_generation_step(
  p_generation_id uuid, p_expected_lock bigint, p_step text, p_error jsonb,
  p_duration_ms integer, p_failed_at timestamptz
) returns public.pedagogical_generation_jobs
language plpgsql security definer set search_path = public as $$
declare result public.pedagogical_generation_jobs;
begin
  update public.pedagogical_generation_jobs set status = 'failed', error = p_error,
    attempts = least(attempts + 1, max_attempts), lock_version = lock_version + 1, updated_at = p_failed_at
  where id = p_generation_id and lock_version = p_expected_lock and status = 'running' and current_step = p_step returning * into result;
  if result.id is not null then
    insert into public.pedagogical_ai_events(generation_id, school_id, user_id, step, status, prompt_version, duration_ms, error_code)
    values (result.id, result.school_id, result.created_by_user_id, p_step, 'failed', result.prompt_version, p_duration_ms, p_error->>'code');
  end if;
  return result;
end;
$$;

revoke all on function public.reserve_pedagogical_generation_job(uuid,uuid) from public, anon, authenticated;
revoke all on function public.reserve_pedagogical_generation_call(uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.complete_pedagogical_generation_step(uuid,bigint,text,text,jsonb,jsonb,integer,timestamptz,boolean) from public, anon, authenticated;
revoke all on function public.fail_pedagogical_generation_step(uuid,bigint,text,jsonb,integer,timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_pedagogical_generation_job(uuid,uuid), public.reserve_pedagogical_generation_call(uuid,uuid,uuid),
  public.complete_pedagogical_generation_step(uuid,bigint,text,text,jsonb,jsonb,integer,timestamptz,boolean),
  public.fail_pedagogical_generation_step(uuid,bigint,text,jsonb,integer,timestamptz) to service_role;

alter table public.pedagogical_generation_jobs enable row level security;
alter table public.pedagogical_generation_usage enable row level security;
alter table public.pedagogical_ai_events enable row level security;

create policy pedagogical_generation_owner_read on public.pedagogical_generation_jobs for select to authenticated using (
  school_id = public.current_user_school_id() and (created_by_user_id = auth.uid() or public.current_user_role() in ('SCHOOL_ADMIN','SUPER_ADMIN'))
);
create policy pedagogical_generation_usage_admin_read on public.pedagogical_generation_usage for select to authenticated using (
  school_id = public.current_user_school_id() and (user_id = auth.uid() or public.current_user_role() in ('SCHOOL_ADMIN','SUPER_ADMIN'))
);
create policy pedagogical_ai_events_admin_read on public.pedagogical_ai_events for select to authenticated using (
  school_id = public.current_user_school_id() and (user_id = auth.uid() or public.current_user_role() in ('SCHOOL_ADMIN','SUPER_ADMIN'))
);

revoke all on public.pedagogical_generation_jobs, public.pedagogical_generation_usage, public.pedagogical_ai_events from anon, authenticated;
grant all on public.pedagogical_generation_jobs, public.pedagogical_generation_usage, public.pedagogical_ai_events to service_role;
grant usage, select on sequence public.pedagogical_ai_events_id_seq to service_role;

