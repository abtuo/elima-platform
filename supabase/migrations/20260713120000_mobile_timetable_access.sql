-- Lecture mobile de l'emploi du temps, limitée au périmètre réel de chaque rôle.
-- Cette migration ne modifie aucune donnée métier.

drop policy if exists "Mobile members read relevant timetable" on public.timetable_events;
create policy "Mobile members read relevant timetable" on public.timetable_events
for select to authenticated
using (
  school_id = public.mobile_current_user_school_id()
  and (
    public.mobile_current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'COMPTABLE')
    or (public.mobile_current_user_role() = 'TEACHER' and exists (select 1 from public.teachers t where t.id = timetable_events.teacher_id and t.user_id = auth.uid()))
    or (public.mobile_current_user_role() = 'STUDENT' and exists (select 1 from public.students s where s.class_id = timetable_events.class_id and s.user_id = auth.uid()))
    or (public.mobile_current_user_role() = 'PARENT' and exists (select 1 from public.parents p join public.student_parents sp on sp.parent_id = p.id join public.students s on s.id = sp.student_id where p.user_id = auth.uid() and s.class_id = timetable_events.class_id))
  )
);
