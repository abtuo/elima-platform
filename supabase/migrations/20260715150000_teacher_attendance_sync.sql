-- Synchronisation atomique d'une feuille d'appel par son enseignant.
create or replace function public.mobile_sync_teacher_attendance(p_records jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_teacher public.teachers%rowtype;
  record_count integer;
  synced_count integer;
begin
  if jsonb_typeof(p_records) <> 'array' then raise exception 'La feuille d''appel est invalide.'; end if;
  record_count := jsonb_array_length(p_records);
  if record_count = 0 then return 0; end if;

  select t.* into current_teacher from public.teachers t where t.user_id = auth.uid();
  if current_teacher.id is null then raise exception 'Profil enseignant introuvable.'; end if;

  if exists (
    select 1
    from jsonb_array_elements(p_records) as item
    left join public.students s on s.id = (item->>'student_id')::uuid
    where s.id is null
      or s.school_id <> current_teacher.school_id
      or s.class_id <> (item->>'class_id')::uuid
      or (item->>'status') not in ('PRESENT', 'ABSENT', 'LATE')
      or not exists (
        select 1 from public.teacher_subject_classes tsc
        where tsc.teacher_id = current_teacher.id and tsc.class_id = s.class_id
        union all
        select 1 from public.class_teachers ct
        where ct.teacher_id = current_teacher.id and ct.class_id = s.class_id
      )
  ) then raise exception 'La feuille contient un élève ou une classe non autorisés.'; end if;

  insert into public.attendance (school_id, class_id, student_id, recorded_by, status, reason, date)
  select
    current_teacher.school_id,
    (item->>'class_id')::uuid,
    (item->>'student_id')::uuid,
    auth.uid(),
    (item->>'status')::public.attendance_status,
    nullif(item->>'reason', ''),
    (item->>'date')::date
  from jsonb_array_elements(p_records) as item
  on conflict (student_id, date) do update set
    school_id = excluded.school_id,
    class_id = excluded.class_id,
    recorded_by = excluded.recorded_by,
    status = excluded.status,
    reason = excluded.reason;

  get diagnostics synced_count = row_count;
  return synced_count;
end;
$$;

revoke all on function public.mobile_sync_teacher_attendance(jsonb) from public;
grant execute on function public.mobile_sync_teacher_attendance(jsonb) to authenticated;
