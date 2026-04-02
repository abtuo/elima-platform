-- Elima MVP seed (CI dataset) for Supabase Cloud
-- هدف: dataset réaliste multi-écoles (CI) + classes/élèves/enseignants/parents + liens parent-enfant.
-- NOTE:
-- - Ce seed crée des utilisateurs Supabase Auth (auth.users) pour ADMIN/TEACHER uniquement.
-- - Les parents existent côté domaine (public.parents) sans compte Auth.
-- - Les élèves (students) sont créés sans compte Auth (students.user_id est nullable).
-- - Password par défaut pour tous les comptes créés ici: "Password123!"

begin;

-- --------------------------------------------------
-- Helpers
-- --------------------------------------------------

-- We need an auth.instance_id to insert into auth.users.
-- Depending on Supabase version, `auth.instances` can be empty. We therefore try:
-- 1) existing auth.users.instance_id
-- 2) auth.instances.id (fallback)
-- If both are empty, we generate a new UUID and insert into auth.instances.
do $$
declare
  inst uuid;
begin
  select instance_id into inst from auth.users where instance_id is not null limit 1;
  if inst is null then
    select id into inst from auth.instances limit 1;
  end if;
  if inst is null then
    inst := gen_random_uuid();
    insert into auth.instances (id, uuid, raw_base_config, created_at, updated_at)
    values (inst, inst, '{}'::jsonb, now(), now())
    on conflict (id) do nothing;
  end if;

  -- Make it available for the rest of the script.
  perform set_config('elima.instance_id', inst::text, true);
end$$;

-- Small helper: deterministic-ish email prefix
-- (keep it simple and unique)

-- Reusable seed datasets (temporary tables)
create temp table if not exists seed_admins (
  school_id uuid not null,
  email text not null,
  full_name text not null
) on commit drop;

truncate table seed_admins;
insert into seed_admins (school_id, email, full_name)
values
  ('11111111-1111-1111-1111-111111111111'::uuid, 'admin.yakro@elima.demo', 'Admin Yakro'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'admin.cocody@elima.demo', 'Admin Cocody');

create temp table if not exists seed_teachers (
  school_id uuid not null,
  email text not null,
  full_name text not null,
  phone text
) on commit drop;

truncate table seed_teachers;
insert into seed_teachers (school_id, email, full_name, phone)
select
  case when gs <= 74 then '11111111-1111-1111-1111-111111111111'::uuid else '22222222-2222-2222-2222-222222222222'::uuid end as school_id,
  format('teacher%04s@elima.demo', gs) as email,
  format('Enseignant %s', gs) as full_name,
  format('+225%09s', 100000000 + gs) as phone
from generate_series(1, 134) gs;

create temp table if not exists seed_parents (
  school_id uuid not null,
  email text not null,
  full_name text not null,
  phone text
) on commit drop;

truncate table seed_parents;
insert into seed_parents (school_id, email, full_name, phone)
select
  case when gs <= 950 then '11111111-1111-1111-1111-111111111111'::uuid else '22222222-2222-2222-2222-222222222222'::uuid end as school_id,
  format('parent%04s@elima.demo', gs) as email,
  format('Parent %s', gs) as full_name,
  format('+225%09s', 200000000 + gs) as phone
from generate_series(1, 1550) gs;

-- --------------------------------------------------
-- Schools
-- --------------------------------------------------

insert into public.schools (id, name, country, city, status)
values
  ('11111111-1111-1111-1111-111111111111', 'Lycée Scientifique de Yamoussoukro', 'Côte d’Ivoire', 'Yamoussoukro', 'public'),
  ('22222222-2222-2222-2222-222222222222', 'Lycée Sainte Marie de Cocody', 'Côte d’Ivoire', 'Abidjan', 'public')
on conflict (id) do nothing;

-- --------------------------------------------------
-- Terms (Trimestre 1)
-- --------------------------------------------------

insert into public.terms (school_id, name, start_date, end_date, is_closed)
values
  ('11111111-1111-1111-1111-111111111111', 'Trimestre 1', '2025-09-09', '2025-12-20', false),
  ('22222222-2222-2222-2222-222222222222', 'Trimestre 1', '2025-09-09', '2025-12-20', false);

-- --------------------------------------------------
-- Subjects (shared set, but per school in this schema)
-- --------------------------------------------------

with base_subjects as (
  select * from (values
    ('Mathématiques', 4.0),
    ('Physique-Chimie', 3.0),
    ('SVT', 2.0),
    ('Français', 3.0),
    ('Anglais', 2.0),
    ('Philosophie', 2.0),
    ('Histoire-Géographie', 2.0),
    ('EPS', 1.0),
    ('Informatique', 1.0),
    ('Espagnol', 1.0)
  ) as t(name, coefficient)
)
insert into public.subjects (school_id, name, coefficient)
select s.id, b.name, b.coefficient
from public.schools s
cross join base_subjects b
on conflict do nothing;

-- --------------------------------------------------
-- Classes
-- --------------------------------------------------

-- School 1 (28 classes):
-- 1 × 4ème, 1 × 3ème, 9 × Seconde C, 8 × Première C, 2 × Première D, 5 × Terminale C, 2 × Terminale D

with spec(level, series, cnt) as (
  values
    ('4ème', null, 1),
    ('3ème', null, 1),
    ('Seconde', 'C', 9),
    ('Première', 'C', 8),
    ('Première', 'D', 2),
    ('Terminale', 'C', 5),
    ('Terminale', 'D', 2)
), expanded as (
  select
    '11111111-1111-1111-1111-111111111111'::uuid as school_id,
    level,
    series,
    generate_series(1, cnt) as n
  from spec
)
insert into public.classes (school_id, name, level, academic_year)
select
  school_id,
  case
    when series is null then format('%s %s', level, chr(64 + n))
    else format('%s %s %s', level, series, n)
  end as name,
  case when series is null then level else format('%s %s', level, series) end as level,
  '2025-2026'
from expanded;

-- School 2 (40 classes): balanced auto distribution from 6ème to Terminale
with levels as (
  select * from (values
    ('6ème'),('5ème'),('4ème'),('3ème'),
    ('Seconde A'),('Seconde C'),
    ('Première A'),('Première C'),('Première D'),
    ('Terminale A'),('Terminale C'),('Terminale D')
  ) as t(level)
), expanded as (
  -- distribute 40 classes across 12 levels (3 each = 36) + 4 extra on first levels
  select
    '22222222-2222-2222-2222-222222222222'::uuid as school_id,
    level,
    (case when row_number() over (order by level) <= 4 then 4 else 3 end) as cnt
  from levels
), gen as (
  select school_id, level, generate_series(1, cnt) as n from expanded
)
insert into public.classes (school_id, name, level, academic_year)
select
  school_id,
  format('%s %s', level, chr(64 + n)) as name,
  level,
  '2025-2026'
from gen;

-- --------------------------------------------------
-- Auth + Profiles: ADMIN + TEACHERS + PARENTS
-- --------------------------------------------------

-- Create 2 admins (one per school)

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select
  gen_random_uuid(),
  current_setting('elima.instance_id')::uuid,
  'authenticated',
  'authenticated',
  a.email,
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object(
    'role', 'SCHOOL_ADMIN',
    'school_id', a.school_id::text,
    'full_name', a.full_name
  ),
  now(),
  now()
from seed_admins a
where not exists (select 1 from auth.users au where lower(au.email) = lower(a.email));

-- public.users rows are created by trigger `on_auth_user_created` using raw_user_meta_data.

-- Teachers: 74 for school1, 60 for school2 = 134

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select
  gen_random_uuid(),
  current_setting('elima.instance_id')::uuid,
  'authenticated',
  'authenticated',
  t.email,
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object(
    'role', 'TEACHER',
    'school_id', t.school_id::text,
    'full_name', t.full_name,
    'phone', t.phone
  ),
  now(),
  now()
from seed_teachers t
where not exists (select 1 from auth.users au where lower(au.email) = lower(t.email));

-- public.users + public.teachers rows are created by trigger `on_auth_user_created`.

-- IMPORTANT:
-- We do NOT create a second auth.users row per teacher for phone login.
-- Supabase Auth primary key is (id) so inserting the same id twice would fail.
-- In this codebase, phone+password login already resolves to the teacher email stored in public.users.

-- Parents: target ~1550
-- - 900 parents for school1 (1 parent = 1 élève)
-- - 600 parents for school2 (1 parent = 1-2 élèves)
-- - 50 cross-school parents (primary in school1, also linked to 1-2 students in school2)

-- Parents (NO AUTH ACCOUNTS)
-- We keep parents in domain tables + links to students, but we do NOT create Supabase Auth users for them.
-- This requires schema where public.parents.user_id is nullable.

insert into public.parents (school_id, user_id, email, full_name, phone)
select p.school_id, null, p.email, p.full_name, p.phone
from seed_parents p
on conflict do nothing;

-- --------------------------------------------------
-- Students: ~2400 (900 in school1, 1500 in school2)
-- --------------------------------------------------

-- Helper to pick classes per school
with s1_classes as (
  select id, row_number() over (order by name) as rn
  from public.classes
  where school_id = '11111111-1111-1111-1111-111111111111'
), s2_classes as (
  select id, row_number() over (order by name) as rn
  from public.classes
  where school_id = '22222222-2222-2222-2222-222222222222'
),
-- school1: 28 classes * ~32 = 896, then add 4 more
s1_students as (
  select
    '11111111-1111-1111-1111-111111111111'::uuid as school_id,
    c.id as class_id,
    gs as seq
  from s1_classes c
  join generate_series(1, 32) gs on true
),
s1_extra as (
  select
    '11111111-1111-1111-1111-111111111111'::uuid as school_id,
    (select id from s1_classes where rn = 1) as class_id,
    gs as seq
  from generate_series(1, 4) gs
),
-- school2: 40 classes * 37 = 1480, then add 20 more
s2_students as (
  select
    '22222222-2222-2222-2222-222222222222'::uuid as school_id,
    c.id as class_id,
    gs as seq
  from s2_classes c
  join generate_series(1, 37) gs on true
),
s2_extra as (
  select
    '22222222-2222-2222-2222-222222222222'::uuid as school_id,
    (select id from s2_classes where rn = 1) as class_id,
    gs as seq
  from generate_series(1, 20) gs
),
all_students as (
  select * from s1_students
  union all
  select * from s1_extra
  union all
  select * from s2_students
  union all
  select * from s2_extra
),
named as (
  select
    school_id,
    class_id,
    format('Élève %s-%s', left(school_id::text, 4), row_number() over (partition by school_id order by class_id, seq)) as full_name
  from all_students
)
insert into public.students (school_id, class_id, full_name)
select school_id, class_id, full_name
from named;

-- --------------------------------------------------
-- Link STUDENT_PARENTS
-- --------------------------------------------------

-- School1: 1 parent = 1 student (first 900 students)
with s1_students as (
  select id as student_id, row_number() over (order by created_at, id) as rn
  from public.students
  where school_id = '11111111-1111-1111-1111-111111111111'
  limit 900
), s1_parents as (
  select p.id as parent_id, row_number() over (order by p.created_at, p.id) as rn
  from public.parents p
  where p.school_id = '11111111-1111-1111-1111-111111111111'
  limit 900
)
insert into public.student_parents (student_id, parent_id, relationship)
select s.student_id, p.parent_id, 'parent'
from s1_students s
join s1_parents p using (rn)
on conflict do nothing;

-- School2: parents can have 1 or 2 children
-- Link first 1200 students to first 600 parents (2 children each)
with s2_students as (
  select id as student_id, row_number() over (order by created_at, id) as rn
  from public.students
  where school_id = '22222222-2222-2222-2222-222222222222'
  limit 1200
), s2_parents as (
  select p.id as parent_id, row_number() over (order by p.created_at, p.id) as rn
  from public.parents p
  where p.school_id = '22222222-2222-2222-2222-222222222222'
  limit 600
), pairs as (
  select
    s.student_id,
    ((s.rn + 1) / 2) as parent_rn
  from s2_students s
)
insert into public.student_parents (student_id, parent_id, relationship)
select pr.student_id, p.parent_id, 'parent'
from pairs pr
join s2_parents p on p.rn = pr.parent_rn
on conflict do nothing;

-- Cross-school: take 50 parents from school1 and link them to 1-2 students in school2
with cross_parents as (
  select p.id as parent_id, row_number() over (order by p.created_at, p.id) as rn
  from public.parents p
  where p.school_id = '11111111-1111-1111-1111-111111111111'
  offset 850
  limit 50
), cross_students as (
  select s.id as student_id, row_number() over (order by s.created_at, s.id) as rn
  from public.students s
  where s.school_id = '22222222-2222-2222-2222-222222222222'
  offset 1200
  limit 75
), mapping as (
  -- 50 parents map to 75 students: 25 parents get 2 kids, 25 parents get 1 kid
  select
    cs.student_id,
    case
      when cs.rn <= 50 then cs.rn
      else cs.rn - 50
    end as parent_rn
  from cross_students cs
)
insert into public.student_parents (student_id, parent_id, relationship)
select m.student_id, p.parent_id, 'parent'
from mapping m
join cross_parents p on p.rn = m.parent_rn
on conflict do nothing;

-- --------------------------------------------------
-- Optional: create 1 conversation + a few messages (for quick smoke test)
-- --------------------------------------------------

-- Create a conversation in school1 between a teacher and an admin (parents have no Auth user_id)
with t as (
  select u.id as teacher_user_id
  from public.users u
  where u.school_id = '11111111-1111-1111-1111-111111111111' and u.role = 'TEACHER'
  order by u.created_at
  limit 1
), p as (
  select u.id as admin_user_id
  from public.users u
  where u.school_id = '11111111-1111-1111-1111-111111111111' and u.role = 'SCHOOL_ADMIN'
  order by u.created_at
  limit 1
), conv as (
  insert into public.conversations (school_id, title)
  values ('11111111-1111-1111-1111-111111111111', 'Demo: discussion enseignant ↔ admin')
  returning id
), participants as (
  insert into public.conversation_participants (conversation_id, participant_type, user_id)
  select conv.id, 'USER', x.user_id
  from conv
  cross join (
    select teacher_user_id as user_id from t
    union all
    select admin_user_id as user_id from p
  ) x
  returning conversation_id
)
insert into public.messages (conversation_id, sender_id, content)
select
  conv.id,
  (select teacher_user_id from t),
  'Bonjour, voici un message de test.'
from conv
union all
select
  conv.id,
  (select admin_user_id from p),
  'Merci, bien reçu !'
from conv;

commit;
