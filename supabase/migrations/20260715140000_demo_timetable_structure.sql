-- Salles de référence par classe et protection contre les doublons de planning.
alter table public.classes add column if not exists default_room text;
alter table public.timetable_events add column if not exists event_type text not null default 'course';
alter table public.timetable_events add column if not exists title text;
alter table public.timetable_events add column if not exists evaluation_id uuid references public.evaluations(id) on delete cascade;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'timetable_events_event_type_check'
      and conrelid = 'public.timetable_events'::regclass
  ) then
    alter table public.timetable_events add constraint timetable_events_event_type_check
      check (event_type in ('course', 'evaluation'));
  end if;
end$$;

comment on column public.classes.default_room is
  'Salle habituelle de la classe. Les cours spécialisés peuvent utiliser une autre salle.';

with duplicates as (
  select id, row_number() over (
    partition by school_id, class_id, teacher_id, subject_id, starts_at
    order by created_at, id
  ) as duplicate_number
  from public.timetable_events
)
delete from public.timetable_events as event
using duplicates
where event.id = duplicates.id and duplicates.duplicate_number > 1;

create unique index if not exists uq_timetable_events_assignment_start
  on public.timetable_events (school_id, class_id, teacher_id, subject_id, starts_at);

-- Une seule décision d'appel par élève et par jour, réutilisable lors d'une
-- synchronisation hors ligne ou d'une correction par l'enseignant.
with attendance_duplicates as (
  select id, row_number() over (
    partition by student_id, date
    order by created_at desc, id desc
  ) as duplicate_number
  from public.attendance
)
delete from public.attendance as attendance
using attendance_duplicates
where attendance.id = attendance_duplicates.id and attendance_duplicates.duplicate_number > 1;

create unique index if not exists uq_attendance_student_date
  on public.attendance (student_id, date);

update public.classes as c
set default_room = case c.name
  when '6ème A' then 'Bâtiment A · Salle 2'
  when '6ème B' then 'Bâtiment A · Salle 3'
  when '6ème C' then 'Bâtiment A · Salle 4'
  when '5ème A' then 'Bâtiment A · Salle 5'
  when '5ème B' then 'Bâtiment A · Salle 6'
  when '4ème A' then 'Bâtiment B · Salle 2'
  when '4ème B' then 'Bâtiment B · Salle 3'
  when '3ème A' then 'Bâtiment B · Salle 6'
  when '3ème B' then 'Bâtiment B · Salle 7'
  when '2nde A' then 'Bâtiment C · Salle 2'
  when '2nde C1' then 'Bâtiment C · Salle 3'
  when '1ère A' then 'Bâtiment C · Salle 5'
  when 'Tle A' then 'Bâtiment C · Salle 7'
  else c.default_room
end
where exists (
  select 1 from public.schools as s
  where s.id = c.school_id and coalesce(s.is_demo, false)
);

create or replace function public.mobile_create_teacher_evaluation_event(
  p_class_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_max_score numeric default 20
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_teacher public.teachers%rowtype;
  selected_subject_id uuid;
  selected_room text;
  created_evaluation_id uuid;
  created_event_id uuid;
begin
  if nullif(btrim(p_title), '') is null then raise exception 'Le titre de l''évaluation est obligatoire.'; end if;
  if p_starts_at >= p_ends_at then raise exception 'Les horaires de l''évaluation sont invalides.'; end if;
  if (p_starts_at at time zone 'Africa/Abidjan')::date <> (p_ends_at at time zone 'Africa/Abidjan')::date then
    raise exception 'Une évaluation doit commencer et finir le même jour.';
  end if;

  select t.* into current_teacher
  from public.teachers as t
  where t.user_id = auth.uid();
  if current_teacher.id is null then raise exception 'Profil enseignant introuvable.'; end if;

  select tsc.subject_id, c.default_room into selected_subject_id, selected_room
  from public.teacher_subject_classes as tsc
  join public.classes as c on c.id = tsc.class_id and c.school_id = current_teacher.school_id
  join public.subjects as s on s.id = tsc.subject_id
  where tsc.teacher_id = current_teacher.id and tsc.class_id = p_class_id
  order by (s.name = current_teacher.primary_subject) desc, s.name
  limit 1;
  if selected_subject_id is null then raise exception 'Cette classe n''est pas affectée à cet enseignant.'; end if;

  if exists (
    select 1 from public.timetable_events e
    where (e.teacher_id = current_teacher.id or e.class_id = p_class_id)
      and tstzrange(e.starts_at, e.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then raise exception 'Ce créneau chevauche déjà un cours ou une évaluation.'; end if;

  insert into public.evaluations (school_id, class_id, subject_id, title, max_score, evaluation_date, teacher_id, created_by)
  values (current_teacher.school_id, p_class_id, selected_subject_id, btrim(p_title), coalesce(p_max_score, 20), (p_starts_at at time zone 'Africa/Abidjan')::date, current_teacher.id, auth.uid())
  returning id into created_evaluation_id;

  insert into public.timetable_events (school_id, class_id, teacher_id, subject_id, starts_at, ends_at, room, event_type, title, evaluation_id)
  values (current_teacher.school_id, p_class_id, current_teacher.id, selected_subject_id, p_starts_at, p_ends_at, selected_room, 'evaluation', btrim(p_title), created_evaluation_id)
  returning id into created_event_id;
  return created_event_id;
end;
$$;

revoke all on function public.mobile_create_teacher_evaluation_event(uuid, text, timestamptz, timestamptz, numeric) from public;
grant execute on function public.mobile_create_teacher_evaluation_event(uuid, text, timestamptz, timestamptz, numeric) to authenticated;
