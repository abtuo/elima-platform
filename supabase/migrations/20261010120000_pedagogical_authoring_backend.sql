create extension if not exists pgcrypto;

create table if not exists public.pedagogical_resources (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  title text not null check (length(title) between 1 and 300),
  resource_type text not null,
  subject text not null,
  subject_id uuid references public.subjects(id) on delete set null,
  level text not null,
  chapter text,
  search_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(search_metadata) = 'object'),
  visibility text not null default 'private' check (visibility in ('private', 'school')),
  state text not null default 'draft' check (state in ('draft', 'in_review', 'changes_requested', 'validated', 'published', 'archived')),
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.pedagogical_resource_versions (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.pedagogical_resources(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  parent_version_id uuid references public.pedagogical_resource_versions(id) on delete restrict,
  schema_version text not null,
  state text not null default 'draft' check (state in ('draft', 'in_review', 'changes_requested', 'validated', 'published', 'archived')),
  public_document jsonb not null check (jsonb_typeof(public_document) = 'object'),
  content_checksum text not null check (content_checksum ~ '^[0-9a-f]{64}$'),
  lock_version bigint not null default 1 check (lock_version > 0),
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  foreign key (resource_id, parent_version_id) references public.pedagogical_resource_versions(resource_id, id) on delete restrict,
  unique (resource_id, version_number),
  unique (resource_id, id)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'pedagogical_resources_current_version_fk') then
    alter table public.pedagogical_resources
      add constraint pedagogical_resources_current_version_fk
      foreign key (id, current_version_id)
      references public.pedagogical_resource_versions(resource_id, id)
      deferrable initially deferred;
  end if;
end $$;

create table if not exists public.pedagogical_resource_version_secrets (
  version_id uuid primary key references public.pedagogical_resource_versions(id) on delete cascade,
  private_content jsonb not null check (jsonb_typeof(private_content) = 'object'),
  updated_at timestamptz not null default now()
);

create table if not exists public.pedagogical_resource_reviews (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.pedagogical_resource_versions(id) on delete cascade,
  review_type text not null check (review_type in ('automatic', 'human')),
  validator_user_id uuid references public.users(id) on delete set null,
  validator_version text,
  result text not null check (result in ('passed', 'failed', 'approved', 'rejected')),
  errors jsonb not null default '[]'::jsonb check (jsonb_typeof(errors) = 'array'),
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(reasons) = 'array'),
  reviewed_at timestamptz not null default now()
);

create table if not exists public.pedagogical_publications (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.pedagogical_resources(id) on delete restrict,
  version_id uuid not null references public.pedagogical_resource_versions(id) on delete restrict,
  channel text not null check (channel in ('revision', 'student_pdf', 'teacher_pdf', 'api')),
  state text not null default 'active' check (state in ('scheduled', 'active', 'withdrawn', 'archived')),
  published_by_user_id uuid not null references public.users(id) on delete restrict,
  corrections_policy text not null default 'teacher_only' check (corrections_policy in ('teacher_only', 'after_due_date', 'after_submission', 'never')),
  available_from timestamptz,
  available_until timestamptz,
  published_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  check (available_until is null or available_from is null or available_until > available_from),
  foreign key (resource_id, version_id) references public.pedagogical_resource_versions(resource_id, id) on delete restrict,
  unique (version_id, channel)
);

create table if not exists public.pedagogical_assignments (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.pedagogical_publications(id) on delete restrict,
  school_id uuid not null references public.schools(id) on delete cascade,
  target_type text not null check (target_type in ('class', 'group', 'student')),
  target_id uuid not null,
  assigned_by_user_id uuid not null references public.users(id) on delete restrict,
  corrections_policy text not null check (corrections_policy in ('teacher_only', 'after_due_date', 'after_submission', 'never')),
  available_from timestamptz,
  available_until timestamptz,
  created_at timestamptz not null default now(),
  check (available_until is null or available_from is null or available_until > available_from),
  unique (publication_id, target_type, target_id)
);

create table if not exists public.pedagogical_resource_events (
  id bigint generated always as identity primary key,
  resource_id uuid not null references public.pedagogical_resources(id) on delete cascade,
  version_id uuid references public.pedagogical_resource_versions(id) on delete set null,
  actor_user_id uuid references public.users(id) on delete set null,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb check (jsonb_typeof(event_data) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists idx_pedagogical_resources_tenant_search on public.pedagogical_resources(school_id, state, subject, level, updated_at desc);
create index if not exists idx_pedagogical_resources_author on public.pedagogical_resources(created_by_user_id, updated_at desc);
create index if not exists idx_pedagogical_versions_resource on public.pedagogical_resource_versions(resource_id, version_number desc);
create index if not exists idx_pedagogical_reviews_version on public.pedagogical_resource_reviews(version_id, reviewed_at desc);
create index if not exists idx_pedagogical_publications_resource on public.pedagogical_publications(resource_id, state, published_at desc);
create index if not exists idx_pedagogical_assignments_tenant_target on public.pedagogical_assignments(school_id, target_type, target_id);
create index if not exists idx_pedagogical_events_resource on public.pedagogical_resource_events(resource_id, created_at desc);

create or replace function public.validate_pedagogical_assignment_target()
returns trigger language plpgsql set search_path = public as $$
declare publication_school uuid;
begin
  select r.school_id into publication_school
  from public.pedagogical_publications p
  join public.pedagogical_resources r on r.id = p.resource_id
  where p.id = new.publication_id;
  if publication_school is null or publication_school <> new.school_id then
    raise exception 'Assignment tenant mismatch' using errcode = '23514';
  end if;
  if new.target_type = 'class' and not exists (select 1 from public.classes c where c.id = new.target_id and c.school_id = new.school_id) then
    raise exception 'Assignment class tenant mismatch' using errcode = '23514';
  end if;
  if new.target_type = 'student' and not exists (select 1 from public.students s where s.id = new.target_id and s.school_id = new.school_id) then
    raise exception 'Assignment student tenant mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists pedagogical_assignment_target_integrity on public.pedagogical_assignments;
create trigger pedagogical_assignment_target_integrity before insert or update on public.pedagogical_assignments
for each row execute function public.validate_pedagogical_assignment_target();

create or replace function public.prevent_published_pedagogical_version_changes()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.state = 'published' or exists (select 1 from public.pedagogical_publications where version_id = old.id) then
    raise exception 'Published pedagogical versions are immutable' using errcode = '55000';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists pedagogical_versions_immutable on public.pedagogical_resource_versions;
create trigger pedagogical_versions_immutable before update or delete on public.pedagogical_resource_versions
for each row execute function public.prevent_published_pedagogical_version_changes();

create or replace function public.prevent_published_pedagogical_secret_changes()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (
    select 1 from public.pedagogical_resource_versions v
    where v.id = old.version_id and (v.state = 'published' or exists (
      select 1 from public.pedagogical_publications p where p.version_id = v.id
    ))
  ) then
    raise exception 'Published pedagogical secrets are immutable' using errcode = '55000';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists pedagogical_secrets_immutable on public.pedagogical_resource_version_secrets;
create trigger pedagogical_secrets_immutable before update or delete on public.pedagogical_resource_version_secrets
for each row execute function public.prevent_published_pedagogical_secret_changes();

create or replace function public.create_pedagogical_resource(
  p_resource_id uuid, p_version_id uuid, p_school_id uuid, p_actor_id uuid,
  p_title text, p_resource_type text, p_subject text, p_level text, p_chapter text,
  p_search_metadata jsonb, p_visibility text, p_schema_version text,
  p_public_document jsonb, p_private_content jsonb, p_checksum text
) returns public.pedagogical_resources
language plpgsql security definer set search_path = public as $$
declare result public.pedagogical_resources;
begin
  insert into public.pedagogical_resources(id, school_id, created_by_user_id, title, resource_type, subject, level, chapter, search_metadata, visibility)
  values (p_resource_id, p_school_id, p_actor_id, p_title, p_resource_type, p_subject, p_level, p_chapter, p_search_metadata, p_visibility);
  insert into public.pedagogical_resource_versions(id, resource_id, version_number, schema_version, public_document, content_checksum, created_by_user_id)
  values (p_version_id, p_resource_id, 1, p_schema_version, p_public_document, p_checksum, p_actor_id);
  insert into public.pedagogical_resource_version_secrets(version_id, private_content) values (p_version_id, p_private_content);
  update public.pedagogical_resources set current_version_id = p_version_id where id = p_resource_id returning * into result;
  insert into public.pedagogical_resource_events(resource_id, version_id, actor_user_id, event_type) values (p_resource_id, p_version_id, p_actor_id, 'resource_created');
  return result;
end;
$$;

create or replace function public.update_pedagogical_draft(
  p_resource_id uuid, p_version_id uuid, p_expected_lock_version bigint, p_actor_id uuid,
  p_title text, p_resource_type text, p_subject text, p_level text, p_chapter text,
  p_search_metadata jsonb, p_schema_version text, p_public_document jsonb,
  p_private_content jsonb, p_checksum text
) returns public.pedagogical_resource_versions
language plpgsql security definer set search_path = public as $$
declare result public.pedagogical_resource_versions;
begin
  update public.pedagogical_resource_versions set
    schema_version = p_schema_version, public_document = p_public_document,
    content_checksum = p_checksum, lock_version = lock_version + 1,
    state = 'draft', updated_at = now()
  where id = p_version_id and resource_id = p_resource_id
    and lock_version = p_expected_lock_version and state in ('draft', 'changes_requested')
  returning * into result;
  if not found then return null; end if;
  update public.pedagogical_resource_version_secrets set private_content = p_private_content, updated_at = now() where version_id = p_version_id;
  update public.pedagogical_resources set title = p_title, resource_type = p_resource_type,
    subject = p_subject, level = p_level, chapter = p_chapter, search_metadata = p_search_metadata,
    state = 'draft', updated_at = now()
  where id = p_resource_id and current_version_id = p_version_id;
  delete from public.pedagogical_resource_reviews where version_id = p_version_id;
  insert into public.pedagogical_resource_events(resource_id, version_id, actor_user_id, event_type) values (p_resource_id, p_version_id, p_actor_id, 'draft_updated');
  return result;
end;
$$;

create or replace function public.create_pedagogical_resource_version(
  p_version_id uuid, p_resource_id uuid, p_parent_version_id uuid, p_version_number integer,
  p_actor_id uuid, p_schema_version text, p_public_document jsonb, p_private_content jsonb,
  p_checksum text, p_title text, p_resource_type text, p_subject text, p_level text,
  p_chapter text, p_search_metadata jsonb
) returns public.pedagogical_resource_versions
language plpgsql security definer set search_path = public as $$
declare result public.pedagogical_resource_versions; expected integer;
begin
  perform 1 from public.pedagogical_resources where id = p_resource_id for update;
  select coalesce(max(version_number), 0) + 1 into expected from public.pedagogical_resource_versions where resource_id = p_resource_id;
  if p_version_number <> expected then raise exception 'Version number conflict' using errcode = '40001'; end if;
  insert into public.pedagogical_resource_versions(id, resource_id, version_number, parent_version_id, schema_version, public_document, content_checksum, created_by_user_id)
  values (p_version_id, p_resource_id, expected, p_parent_version_id, p_schema_version, p_public_document, p_checksum, p_actor_id) returning * into result;
  insert into public.pedagogical_resource_version_secrets(version_id, private_content) values (p_version_id, p_private_content);
  update public.pedagogical_resources set current_version_id = p_version_id, title = p_title,
    resource_type = p_resource_type, subject = p_subject, level = p_level, chapter = p_chapter,
    search_metadata = p_search_metadata, state = 'draft', updated_at = now() where id = p_resource_id;
  insert into public.pedagogical_resource_events(resource_id, version_id, actor_user_id, event_type) values (p_resource_id, p_version_id, p_actor_id, 'version_created');
  return result;
end;
$$;

create or replace function public.publish_pedagogical_resource_version(
  p_publication_id uuid, p_resource_id uuid, p_version_id uuid, p_channel text,
  p_actor_id uuid, p_corrections_policy text, p_available_from timestamptz, p_available_until timestamptz
) returns public.pedagogical_publications
language plpgsql security definer set search_path = public as $$
declare result public.pedagogical_publications;
begin
  update public.pedagogical_resource_versions set state = 'published', published_at = now(), updated_at = now()
  where id = p_version_id and resource_id = p_resource_id and state = 'validated';
  if not found then raise exception 'Version must be validated' using errcode = '55000'; end if;
  insert into public.pedagogical_publications(id, resource_id, version_id, channel, state, published_by_user_id, corrections_policy, available_from, available_until)
  values (p_publication_id, p_resource_id, p_version_id, p_channel,
    case when p_available_from is not null and p_available_from > now() then 'scheduled' else 'active' end,
    p_actor_id, p_corrections_policy, p_available_from, p_available_until) returning * into result;
  update public.pedagogical_resources set state = 'published', updated_at = now() where id = p_resource_id;
  insert into public.pedagogical_resource_events(resource_id, version_id, actor_user_id, event_type, event_data)
  values (p_resource_id, p_version_id, p_actor_id, 'version_published', jsonb_build_object('channel', p_channel));
  return result;
end;
$$;

revoke all on function public.create_pedagogical_resource(uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,text,text,jsonb,jsonb,text) from public, anon, authenticated;
revoke all on function public.update_pedagogical_draft(uuid,uuid,bigint,uuid,text,text,text,text,text,jsonb,text,jsonb,jsonb,text) from public, anon, authenticated;
revoke all on function public.create_pedagogical_resource_version(uuid,uuid,uuid,integer,uuid,text,jsonb,jsonb,text,text,text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.publish_pedagogical_resource_version(uuid,uuid,uuid,text,uuid,text,timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.create_pedagogical_resource(uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,text,text,jsonb,jsonb,text) to service_role;
grant execute on function public.update_pedagogical_draft(uuid,uuid,bigint,uuid,text,text,text,text,text,jsonb,text,jsonb,jsonb,text) to service_role;
grant execute on function public.create_pedagogical_resource_version(uuid,uuid,uuid,integer,uuid,text,jsonb,jsonb,text,text,text,text,text,text,jsonb) to service_role;
grant execute on function public.publish_pedagogical_resource_version(uuid,uuid,uuid,text,uuid,text,timestamptz,timestamptz) to service_role;

alter table public.pedagogical_resources enable row level security;
alter table public.pedagogical_resource_versions enable row level security;
alter table public.pedagogical_resource_version_secrets enable row level security;
alter table public.pedagogical_resource_reviews enable row level security;
alter table public.pedagogical_publications enable row level security;
alter table public.pedagogical_assignments enable row level security;
alter table public.pedagogical_resource_events enable row level security;

create or replace function public.pedagogical_staff_member(p_school_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.school_memberships m
    where m.user_id = auth.uid() and m.school_id = p_school_id and m.status = 'active'
      and m.role in ('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN')
  );
$$;

create or replace function public.pedagogical_resource_editor(p_resource_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pedagogical_resources r
    join public.school_memberships m on m.school_id = r.school_id and m.user_id = auth.uid() and m.status = 'active'
    where r.id = p_resource_id and (r.created_by_user_id = auth.uid() or m.role in ('SCHOOL_ADMIN', 'SUPER_ADMIN'))
  );
$$;

revoke all on function public.pedagogical_staff_member(uuid) from public;
revoke all on function public.pedagogical_resource_editor(uuid) from public;
grant execute on function public.pedagogical_staff_member(uuid), public.pedagogical_resource_editor(uuid) to authenticated, service_role;

create policy pedagogical_resources_staff_read on public.pedagogical_resources for select to authenticated using (public.pedagogical_staff_member(school_id));
create policy pedagogical_resources_author_create on public.pedagogical_resources for insert to authenticated with check (created_by_user_id = auth.uid() and public.pedagogical_staff_member(school_id));
create policy pedagogical_resources_editor_update on public.pedagogical_resources for update to authenticated using (public.pedagogical_resource_editor(id)) with check (public.pedagogical_resource_editor(id));
create policy pedagogical_versions_staff_read on public.pedagogical_resource_versions for select to authenticated using (exists (select 1 from public.pedagogical_resources r where r.id = resource_id and public.pedagogical_staff_member(r.school_id)));
create policy pedagogical_versions_editor_write on public.pedagogical_resource_versions for all to authenticated using (public.pedagogical_resource_editor(resource_id)) with check (public.pedagogical_resource_editor(resource_id));
create policy pedagogical_secrets_editor_only on public.pedagogical_resource_version_secrets for all to authenticated using (exists (select 1 from public.pedagogical_resource_versions v where v.id = version_id and public.pedagogical_resource_editor(v.resource_id))) with check (exists (select 1 from public.pedagogical_resource_versions v where v.id = version_id and public.pedagogical_resource_editor(v.resource_id)));
create policy pedagogical_reviews_staff_read on public.pedagogical_resource_reviews for select to authenticated using (exists (select 1 from public.pedagogical_resource_versions v join public.pedagogical_resources r on r.id = v.resource_id where v.id = version_id and public.pedagogical_staff_member(r.school_id)));
create policy pedagogical_publications_staff_read on public.pedagogical_publications for select to authenticated using (exists (select 1 from public.pedagogical_resources r where r.id = resource_id and public.pedagogical_staff_member(r.school_id)));
create policy pedagogical_assignments_staff_read on public.pedagogical_assignments for select to authenticated using (public.pedagogical_staff_member(school_id));
create policy pedagogical_events_staff_read on public.pedagogical_resource_events for select to authenticated using (exists (select 1 from public.pedagogical_resources r where r.id = resource_id and public.pedagogical_staff_member(r.school_id)));

revoke all on table public.pedagogical_resource_version_secrets from anon, authenticated;
revoke all on table public.pedagogical_resources, public.pedagogical_resource_versions, public.pedagogical_resource_reviews,
  public.pedagogical_publications, public.pedagogical_assignments, public.pedagogical_resource_events from anon;
grant select on public.pedagogical_resources, public.pedagogical_resource_versions, public.pedagogical_resource_reviews,
  public.pedagogical_publications, public.pedagogical_assignments, public.pedagogical_resource_events to authenticated;
grant all on public.pedagogical_resources, public.pedagogical_resource_versions, public.pedagogical_resource_version_secrets,
  public.pedagogical_resource_reviews, public.pedagogical_publications, public.pedagogical_assignments,
  public.pedagogical_resource_events to service_role;
grant usage, select on sequence public.pedagogical_resource_events_id_seq to service_role;

