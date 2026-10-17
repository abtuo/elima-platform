-- Phase 5: delivery of validated pedagogical resources in Elima Revision.
-- Additive only: historical Learning tables and existing attempts are untouched.

alter table public.pedagogical_publications
  add column if not exists activity_mode text not null default 'training'
    check (activity_mode in ('training', 'evaluation')),
  add column if not exists audience text not null default 'assigned'
    check (audience in ('assigned', 'school')),
  add column if not exists max_attempts integer check (max_attempts is null or max_attempts > 0),
  add column if not exists reveal_after_attempts integer check (reveal_after_attempts is null or reveal_after_attempts > 0),
  add column if not exists withdrawn_by_user_id uuid references public.users(id) on delete set null,
  add column if not exists withdrawal_reason text;

alter table public.pedagogical_assignments
  add column if not exists activity_mode text
    check (activity_mode is null or activity_mode in ('training', 'evaluation')),
  add column if not exists max_attempts integer check (max_attempts is null or max_attempts > 0),
  add column if not exists reveal_after_attempts integer check (reveal_after_attempts is null or reveal_after_attempts > 0);

-- Publication and Revision delivery settings must commit together. The Phase 2
-- RPC remains available for compatibility, while the API uses this extended RPC.
create or replace function public.publish_pedagogical_resource_version_configured(
  p_publication_id uuid, p_resource_id uuid, p_version_id uuid, p_channel text,
  p_actor_id uuid, p_corrections_policy text, p_available_from timestamptz,
  p_available_until timestamptz, p_activity_mode text, p_audience text,
  p_max_attempts integer, p_reveal_after_attempts integer
) returns public.pedagogical_publications
language plpgsql security definer set search_path = public as $$
declare result public.pedagogical_publications;
begin
  update public.pedagogical_resource_versions set state = 'published', published_at = now(), updated_at = now()
  where id = p_version_id and resource_id = p_resource_id and state = 'validated';
  if not found then raise exception 'Version must be validated before publication' using errcode = '23514'; end if;
  insert into public.pedagogical_publications(
    id, resource_id, version_id, channel, state, published_by_user_id,
    corrections_policy, available_from, available_until, activity_mode,
    audience, max_attempts, reveal_after_attempts
  ) values (
    p_publication_id, p_resource_id, p_version_id, p_channel, 'active', p_actor_id,
    p_corrections_policy, p_available_from, p_available_until, p_activity_mode,
    p_audience, p_max_attempts, p_reveal_after_attempts
  ) returning * into result;
  update public.pedagogical_resources set state = 'published', updated_at = now() where id = p_resource_id;
  insert into public.pedagogical_resource_events(resource_id, version_id, actor_user_id, event_type, event_data)
  values (p_resource_id, p_version_id, p_actor_id, 'version_published', jsonb_build_object('channel', p_channel));
  return result;
end;
$$;

revoke all on function public.publish_pedagogical_resource_version_configured(uuid,uuid,uuid,text,uuid,text,timestamptz,timestamptz,text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.publish_pedagogical_resource_version_configured(uuid,uuid,uuid,text,uuid,text,timestamptz,timestamptz,text,text,integer,integer) to service_role;

create table if not exists public.pedagogical_revision_attempts (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.pedagogical_publications(id) on delete restrict,
  assignment_id uuid references public.pedagogical_assignments(id) on delete restrict,
  resource_id uuid not null references public.pedagogical_resources(id) on delete restrict,
  version_id uuid not null references public.pedagogical_resource_versions(id) on delete restrict,
  school_id uuid not null references public.schools(id) on delete restrict,
  local_user_id uuid not null references auth.users(id) on delete restrict,
  external_student_id uuid,
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'completed')),
  activity_mode text not null check (activity_mode in ('training', 'evaluation')),
  attempt_number integer not null check (attempt_number > 0),
  answered_count integer not null default 0 check (answered_count >= 0),
  question_count integer not null default 0 check (question_count >= 0),
  score numeric(10,2) not null default 0,
  max_score numeric(10,2) not null default 0,
  pending_review_count integer not null default 0 check (pending_review_count >= 0),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (local_user_id, publication_id, idempotency_key),
  unique (local_user_id, publication_id, attempt_number),
  foreign key (resource_id, version_id) references public.pedagogical_resource_versions(resource_id, id) on delete restrict
);

create table if not exists public.pedagogical_revision_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.pedagogical_revision_attempts(id) on delete restrict,
  question_id text not null,
  submission_key text not null check (length(submission_key) between 8 and 200),
  raw_answer text not null default '',
  structured_answer jsonb,
  evaluation_status text not null check (evaluation_status in ('correct', 'incorrect', 'partial', 'invalid_format', 'pending_review', 'ungraded')),
  is_correct boolean,
  score_awarded numeric(10,2),
  max_score numeric(10,2) not null default 0,
  attempts_count integer not null default 1 check (attempts_count > 0),
  public_feedback jsonb not null default '{}'::jsonb check (jsonb_typeof(public_feedback) = 'object'),
  teacher_feedback text,
  reviewed_by_user_id uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, question_id, submission_key)
);

create index if not exists idx_pedagogical_revision_attempts_student
  on public.pedagogical_revision_attempts(local_user_id, updated_at desc);
create index if not exists idx_pedagogical_revision_attempts_tracking
  on public.pedagogical_revision_attempts(school_id, publication_id, status, updated_at desc);
create index if not exists idx_pedagogical_revision_answers_attempt
  on public.pedagogical_revision_answers(attempt_id, submitted_at);

alter table public.pedagogical_revision_attempts enable row level security;
alter table public.pedagogical_revision_answers enable row level security;

drop policy if exists pedagogical_revision_attempts_own_read on public.pedagogical_revision_attempts;
create policy pedagogical_revision_attempts_own_read on public.pedagogical_revision_attempts
  for select to authenticated using (local_user_id = auth.uid());

drop policy if exists pedagogical_revision_answers_own_read on public.pedagogical_revision_answers;
create policy pedagogical_revision_answers_own_read on public.pedagogical_revision_answers
  for select to authenticated using (exists (
    select 1 from public.pedagogical_revision_attempts a
    where a.id = attempt_id and a.local_user_id = auth.uid()
  ));

revoke insert, update, delete on public.pedagogical_revision_attempts, public.pedagogical_revision_answers from anon, authenticated;
grant select on public.pedagogical_revision_attempts, public.pedagogical_revision_answers to authenticated;
grant all on public.pedagogical_revision_attempts, public.pedagogical_revision_answers to service_role;

comment on table public.pedagogical_revision_attempts is
  'Phase 5 attempts for versioned pedagogical publications; separate from legacy Learning attempts by design.';
comment on column public.pedagogical_revision_attempts.version_id is
  'Immutable pedagogical version used by the learner.';
