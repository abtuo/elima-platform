-- Sanity checks after running supabase/seed.sql

-- 1) Schools
select id, name, city, status, created_at
from public.schools
order by created_at;

-- 2) Counts by school
select
  s.name as school,
  (select count(*) from public.classes c where c.school_id = s.id) as classes,
  (select count(*) from public.students st where st.school_id = s.id) as students,
  (select count(*) from public.teachers t where t.school_id = s.id) as teachers,
  (select count(*) from public.parents p where p.school_id = s.id) as parents
from public.schools s
order by s.name;

-- 3) Parent -> number of children distribution (top 20)
select
  au.email,
  p.school_id,
  count(sp.student_id) as children_count
from public.parents p
join public.users u on u.id = p.user_id
join auth.users au on au.id = u.id
left join public.student_parents sp on sp.parent_id = p.id
group by au.email, p.school_id
order by children_count desc, au.email
limit 20;

-- 4) Cross-school parents: parents that have children in BOTH schools
with parent_children_schools as (
  select
    p.id as parent_id,
    p.school_id as parent_school_id,
    st.school_id as child_school_id
  from public.parents p
  join public.student_parents sp on sp.parent_id = p.id
  join public.students st on st.id = sp.student_id
  group by p.id, p.school_id, st.school_id
), cross_school_parents as (
  select parent_id
  from parent_children_schools
  group by parent_id
  having count(distinct child_school_id) >= 2
)
select
  au.email,
  p.school_id as parent_school,
  count(distinct st.school_id) as child_schools,
  count(sp.student_id) as total_children
from cross_school_parents c
join public.parents p on p.id = c.parent_id
join public.users u on u.id = p.user_id
join auth.users au on au.id = u.id
join public.student_parents sp on sp.parent_id = p.id
join public.students st on st.id = sp.student_id
group by au.email, p.school_id
order by total_children desc, au.email
limit 50;

-- 5) Quick check conversation/messages
select
  (select count(*) from public.conversations) as conversations,
  (select count(*) from public.conversation_participants) as participants,
  (select count(*) from public.messages) as messages;

-- 6) Teachers exist in Auth + public.users
select
  count(*) filter (where au.id is null) as missing_in_auth,
  count(*) as teacher_profiles
from public.users u
left join auth.users au on au.id = u.id
where u.role = 'TEACHER';
