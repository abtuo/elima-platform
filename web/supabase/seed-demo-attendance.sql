-- Données de présences / absences fictives pour la démo (dashboard KPIs, graphiques, vue admin).
-- Idempotent : relancer le script met à jour les statuts existants pour (élève, date).
--
-- Exécution : Supabase → SQL Editor → coller → Run.
-- Prérequis : au moins des élèves dans public.students (avec school_id et class_id valides).

insert into public.attendance (school_id, class_id, student_id, status, date)
select
  s.school_id,
  s.class_id,
  s.id as student_id,
  case abs(hashtext(s.id::text || '|' || (current_date - n)::text)) % 12
    when 0 then 'ABSENT'::public.attendance_status
    when 1 then 'LATE'::public.attendance_status
    else 'PRESENT'::public.attendance_status
  end as status,
  (current_date - n)::date as date
from public.students s
cross join generate_series(0, 13) as n(n)
on conflict (student_id, date) do update set
  status = excluded.status,
  school_id = excluded.school_id,
  class_id = excluded.class_id;

-- Résumé rapide (optionnel)
select status, count(*)::bigint as rows
from public.attendance
where date >= (current_date - interval '13 days')::date
group by status
order by status;
