-- Un élève peut lire sa propre fiche et sa classe.
-- Seul un compte autonome peut modifier son niveau déclaré.

update public.student_profiles as profile
set school_membership_status = 'linked',
    linked_at = coalesce(profile.linked_at, now())
where exists (
  select 1
  from public.identity_links as link
  where link.local_user_id = profile.id
    and link.external_school_id is not null
);

drop policy if exists "Students read own student record" on public.students;
create policy "Students read own student record" on public.students
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Students read own class" on public.classes;
create policy "Students read own class" on public.classes
for select to authenticated
using (
  exists (
    select 1
    from public.students as student
    where student.user_id = auth.uid()
      and student.class_id = classes.id
  )
);

drop policy if exists student_profiles_update_own on public.student_profiles;
create policy student_profiles_update_own on public.student_profiles
for update to authenticated
using (
  id = auth.uid()
  and school_membership_status = 'standalone'
)
with check (
  id = auth.uid()
  and school_membership_status = 'standalone'
);
