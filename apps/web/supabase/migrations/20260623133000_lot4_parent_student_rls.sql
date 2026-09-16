-- Lot 4 — Espaces Parent / Élève: policies RLS réelles (remplacent les `using(false)`).
-- Idempotent. N'affecte pas les espaces admin/enseignant (qui passent par le
-- client service-role, lequel contourne le RLS). On n'ajoute donc QUE des accès
-- en lecture pour les comptes Parent et Élève sur leur propre périmètre.

-- Helpers (security definer pour traverser les tables liées sans boucle RLS).
create or replace function public.user_can_access_student(target_student uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    where s.id = target_student
      and (
        s.user_id = auth.uid()
        or exists (
          select 1
          from public.student_parents sp
          join public.parents p on p.id = sp.parent_id
          where sp.student_id = s.id and p.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.user_can_access_class(target_class uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    where s.class_id = target_class
      and (
        s.user_id = auth.uid()
        or exists (
          select 1
          from public.student_parents sp
          join public.parents p on p.id = sp.parent_id
          where sp.student_id = s.id and p.user_id = auth.uid()
        )
      )
  );
$$;

-- Parents: lire sa propre fiche.
drop policy if exists "Parents can read own row" on public.parents;
create policy "Parents can read own row"
on public.parents for select to authenticated
using (user_id = auth.uid());

-- Liens élève-parent: lire ses propres liens.
drop policy if exists "Parents can read their links" on public.student_parents;
create policy "Parents can read their links"
on public.student_parents for select to authenticated
using (
  exists (
    select 1 from public.parents p
    where p.id = student_parents.parent_id and p.user_id = auth.uid()
  )
);

-- Élèves (enfants liés ou soi-même).
drop policy if exists "Parents can read linked students" on public.students;
create policy "Parents can read linked students"
on public.students for select to authenticated
using (public.user_can_access_student(id));

-- Classes des élèves accessibles.
drop policy if exists "Parents can read linked classes" on public.classes;
create policy "Parents can read linked classes"
on public.classes for select to authenticated
using (public.user_can_access_class(id));

-- Présences.
drop policy if exists "Parents can read linked attendance" on public.attendance;
create policy "Parents can read linked attendance"
on public.attendance for select to authenticated
using (public.user_can_access_student(student_id));

-- Notes.
drop policy if exists "Parents can read linked grades" on public.grades;
create policy "Parents can read linked grades"
on public.grades for select to authenticated
using (public.user_can_access_student(student_id));

-- Évaluations (par classe accessible).
drop policy if exists "Parents can read linked evaluations" on public.evaluations;
create policy "Parents can read linked evaluations"
on public.evaluations for select to authenticated
using (public.user_can_access_class(class_id));

-- Bulletins.
drop policy if exists "Parents can read linked reports" on public.reports;
create policy "Parents can read linked reports"
on public.reports for select to authenticated
using (public.user_can_access_student(student_id));

-- Devoirs (par classe accessible).
drop policy if exists "Family can read linked homeworks" on public.homeworks;
create policy "Family can read linked homeworks"
on public.homeworks for select to authenticated
using (public.user_can_access_class(class_id));

-- Cahier de textes (Lot 2): garde d'existence pour tolérer l'ordre des migrations.
do $$
begin
  if to_regclass('public.lesson_logs') is not null then
    execute 'drop policy if exists "Family can read linked lesson_logs" on public.lesson_logs';
    execute 'create policy "Family can read linked lesson_logs" on public.lesson_logs for select to authenticated using (public.user_can_access_class(class_id))';
  end if;
end$$;

-- Emploi du temps (par classe accessible).
do $$
begin
  if to_regclass('public.timetable_events') is not null then
    execute 'drop policy if exists "Family can read linked timetable" on public.timetable_events';
    execute 'create policy "Family can read linked timetable" on public.timetable_events for select to authenticated using (public.user_can_access_class(class_id))';
  end if;
end$$;

-- Frais et paiements de l'élève (Lot 3): gardes d'existence.
do $$
begin
  if to_regclass('public.student_fees') is not null then
    execute 'drop policy if exists "Family can read linked student_fees" on public.student_fees';
    execute 'create policy "Family can read linked student_fees" on public.student_fees for select to authenticated using (public.user_can_access_student(student_id))';
  end if;
end$$;

do $$
begin
  if to_regclass('public.payments') is not null then
    execute 'drop policy if exists "Family can read linked payments" on public.payments';
    execute 'create policy "Family can read linked payments" on public.payments for select to authenticated using (public.user_can_access_student(student_id))';
  end if;
end$$;

-- Référentiels école (matières, trimestres) lisibles par les membres de l'école.
drop policy if exists "Members can read school subjects" on public.subjects;
create policy "Members can read school subjects"
on public.subjects for select to authenticated
using (school_id = public.current_user_school_id());

drop policy if exists "Members can read school terms" on public.terms;
create policy "Members can read school terms"
on public.terms for select to authenticated
using (school_id = public.current_user_school_id());
