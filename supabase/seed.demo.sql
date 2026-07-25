-- Seed Demo déclaratif.
--
-- Le reset protégé exécute web/scripts/seed-demo.ts pour créer les comptes via
-- Supabase Auth, puis complète les historiques pédagogiques. Ce fichier garde
-- les invariants SQL reproductibles et peut être rejoué après cette étape.
-- Il ne doit jamais être exécuté en Production.

do $$
begin
  if current_setting('app.settings.app_env', true) is distinct from 'demo' then
    raise exception 'seed.demo.sql refuse une cible qui ne déclare pas app.settings.app_env=demo';
  end if;
end
$$;

insert into public.school_features (school_id, feature_key, enabled, configuration)
select id, feature_key, true, '{}'::jsonb
from public.schools
cross join (
  values
    ('payments'),
    ('revision_ai'),
    ('document_ai'),
    ('timetable_generator'),
    ('offline_mode'),
    ('recommendations'),
    ('elima_store')
) as features(feature_key)
where name = 'Collège Moderne Abidjan'
on conflict (school_id, feature_key) do update
set enabled = excluded.enabled,
    configuration = excluded.configuration,
    updated_at = now();

do $$
declare
  school_count integer;
begin
  select count(*) into school_count from public.schools;
  if school_count <> 1 then
    raise exception 'La Demo doit contenir exactement une école, trouvé %', school_count;
  end if;
  if not exists (
    select 1 from public.schools where name = 'Collège Moderne Abidjan'
  ) then
    raise exception 'Collège Moderne Abidjan est absent';
  end if;
end
$$;
