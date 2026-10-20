-- Cycle scolaire et sauvegarde atomique de l'onboarding Révision.
-- Additif : les niveaux et préférences existants sont conservés.

alter table public.student_profiles
  add column if not exists school_cycle text,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists guardian_acknowledged_at timestamptz;

alter table public.student_profiles
  drop constraint if exists student_profiles_school_cycle_check;
alter table public.student_profiles
  add constraint student_profiles_school_cycle_check
  check (school_cycle is null or school_cycle in ('primary', 'secondary'));

-- Les comptes reconnus sont rétro-compatibles sans nouvel onboarding.
update public.student_profiles
set school_cycle = case
  when upper(btrim(school_level_id)) in ('CM1', 'CM2') then 'primary'
  when lower(btrim(school_level_id)) ~ '^(6|5|4|3)(e|è|eme|ème)?([[:space:]]|$)'
    or lower(btrim(school_level_id)) ~ '^(seconde|2nde|première|premiere|1ère|1ere|terminale)([[:space:]]|$)'
    then 'secondary'
  else school_cycle
end,
onboarding_completed_at = case
  when school_level_id <> '' then coalesce(onboarding_completed_at, updated_at, created_at, now())
  else onboarding_completed_at
end
where school_cycle is null or onboarding_completed_at is null;

create or replace function public.save_revision_onboarding(
  p_cycle text,
  p_school_level_id text,
  p_subject_ids text[],
  p_guardian_acknowledged boolean default false,
  p_declared_school_name text default null,
  p_declared_school_city text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  normalized_cycle text := lower(btrim(coalesce(p_cycle, '')));
  normalized_level text := btrim(coalesce(p_school_level_id, ''));
  normalized_subjects text[];
  allowed_secondary text[] := array['maths','francais','anglais','espagnol','svt','physique-chimie','histoire-geographie','philosophie','ses','informatique','eps','arts'];
begin
  if actor_id is null then raise exception 'Authentification requise'; end if;
  if normalized_cycle not in ('primary', 'secondary') then raise exception 'Cycle scolaire invalide'; end if;

  if normalized_cycle = 'primary' and normalized_level not in ('CM1', 'CM2') then
    raise exception 'Classe primaire invalide';
  end if;
  if normalized_cycle = 'secondary' and normalized_level not in (
    '6ème','5ème','4ème','3ème','Seconde','2nde A','2nde C','Première',
    '1ère A','1ère C','1ère D','Terminale','Terminale A','Terminale C','Terminale D','Autre'
  ) then raise exception 'Classe secondaire invalide'; end if;

  select coalesce(array_agg(distinct btrim(value) order by btrim(value)), '{}'::text[])
  into normalized_subjects
  from unnest(coalesce(p_subject_ids, '{}'::text[])) as value
  where btrim(value) <> '';

  if cardinality(normalized_subjects) = 0 then raise exception 'Choisis au moins une matière'; end if;
  if normalized_cycle = 'primary' and not normalized_subjects <@ array['maths','francais']::text[] then
    raise exception 'Matière primaire indisponible';
  end if;
  if normalized_cycle = 'secondary' and not normalized_subjects <@ allowed_secondary then
    raise exception 'Matière secondaire invalide';
  end if;
  if normalized_cycle = 'primary' and not coalesce(p_guardian_acknowledged, false) then
    raise exception 'Accompagnement adulte requis';
  end if;

  update public.student_profiles
  set school_cycle = normalized_cycle,
      school_level_id = normalized_level,
      declared_school_name = nullif(btrim(coalesce(p_declared_school_name, '')), ''),
      declared_school_city = nullif(btrim(coalesce(p_declared_school_city, '')), ''),
      guardian_acknowledged_at = case
        when normalized_cycle = 'primary' then coalesce(guardian_acknowledged_at, now())
        else guardian_acknowledged_at
      end,
      onboarding_completed_at = now(),
      updated_at = now()
  where id = actor_id and school_membership_status = 'standalone';

  if not found then raise exception 'Profil autonome introuvable ou non modifiable'; end if;

  delete from public.student_revision_subject_preferences
  where user_id = actor_id and not (subject_id = any(normalized_subjects));

  insert into public.student_revision_subject_preferences(user_id, subject_id)
  select actor_id, subject_id from unnest(normalized_subjects) as subject_id
  on conflict (user_id, subject_id) do nothing;

  return jsonb_build_object(
    'cycle', normalized_cycle,
    'schoolLevelId', normalized_level,
    'subjectIds', normalized_subjects,
    'onboardingCompleted', true
  );
end;
$$;

revoke all on function public.save_revision_onboarding(text,text,text[],boolean,text,text) from public;
grant execute on function public.save_revision_onboarding(text,text,text[],boolean,text,text) to authenticated;

