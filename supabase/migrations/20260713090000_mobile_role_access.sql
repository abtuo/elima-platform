-- Accès mobile multi-tenant. Toutes les règles restent bornées à l'établissement
-- porté par public.users.school_id pour l'utilisateur Supabase courant.

-- Ces deux helpers doivent contourner la policy de public.users afin d'éviter
-- une récursion lorsque les policies multi-tenant évaluent le rôle courant.
create function public.mobile_current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create function public.mobile_current_user_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id from public.users where id = auth.uid();
$$;

create function public.mobile_is_school_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.mobile_current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'COMPTABLE', 'TEACHER'), false);
$$;

create function public.mobile_is_school_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.mobile_current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN'), false);
$$;

create policy "Members read own school" on public.schools
for select to authenticated
using (id = public.mobile_current_user_school_id());

create policy "Staff read school users" on public.users
for select to authenticated
using (public.mobile_is_school_staff() and school_id = public.mobile_current_user_school_id());

create policy "Staff read school classes" on public.classes
for select to authenticated
using (public.mobile_is_school_staff() and school_id = public.mobile_current_user_school_id());

create policy "Staff read school subjects" on public.subjects
for select to authenticated
using (public.mobile_is_school_staff() and school_id = public.mobile_current_user_school_id());

create policy "Staff read school teachers" on public.teachers
for select to authenticated
using (public.mobile_is_school_staff() and school_id = public.mobile_current_user_school_id());

create policy "Staff read school parents" on public.parents
for select to authenticated
using (public.mobile_is_school_staff() and school_id = public.mobile_current_user_school_id());

create policy "Staff read school students" on public.students
for select to authenticated
using (public.mobile_is_school_staff() and school_id = public.mobile_current_user_school_id());

create policy "Staff read school family links" on public.student_parents
for select to authenticated
using (
  public.mobile_is_school_staff()
  and exists (
    select 1 from public.students s
    where s.id = student_parents.student_id
      and s.school_id = public.mobile_current_user_school_id()
  )
);

create policy "Staff read class assignments" on public.class_teachers
for select to authenticated
using (
  public.mobile_is_school_staff()
  and exists (
    select 1 from public.classes c
    where c.id = class_teachers.class_id
      and c.school_id = public.mobile_current_user_school_id()
  )
);

create policy "Staff read teacher subject classes" on public.teacher_subject_classes
for select to authenticated
using (
  public.mobile_is_school_staff()
  and exists (
    select 1 from public.classes c
    where c.id = teacher_subject_classes.class_id
      and c.school_id = public.mobile_current_user_school_id()
  )
);

create policy "Staff read school attendance" on public.attendance
for select to authenticated
using (public.mobile_is_school_staff() and school_id = public.mobile_current_user_school_id());

create policy "Teachers record school attendance" on public.attendance
for insert to authenticated
with check (
  public.mobile_current_user_role() = 'TEACHER'
  and school_id = public.mobile_current_user_school_id()
  and recorded_by = auth.uid()
);

create policy "Staff read school evaluations" on public.evaluations
for select to authenticated
using (public.mobile_is_school_staff() and school_id = public.mobile_current_user_school_id());

create policy "Staff read school grades" on public.grades
for select to authenticated
using (public.mobile_is_school_staff() and school_id = public.mobile_current_user_school_id());

create policy "Staff read school homework" on public.homeworks
for select to authenticated
using (public.mobile_is_school_staff() and school_id = public.mobile_current_user_school_id());

create policy "Teachers create school homework" on public.homeworks
for insert to authenticated
with check (
  public.mobile_current_user_role() = 'TEACHER'
  and school_id = public.mobile_current_user_school_id()
  and exists (select 1 from public.teachers t where t.id = teacher_id and t.user_id = auth.uid())
);

create policy "Members read school conversations" on public.conversations
for select to authenticated
using (
  school_id = public.mobile_current_user_school_id()
  and (
    public.mobile_is_school_staff()
    or exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversations.id and cp.user_id = auth.uid()
    )
  )
);

create policy "Members read own conversation memberships" on public.conversation_participants
for select to authenticated
using (
  user_id = auth.uid()
  or (
    public.mobile_is_school_staff()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_participants.conversation_id
        and c.school_id = public.mobile_current_user_school_id()
    )
  )
);

create policy "Members read accessible messages" on public.messages
for select to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and c.school_id = public.mobile_current_user_school_id()
      and (
        public.mobile_is_school_staff()
        or exists (
          select 1 from public.conversation_participants cp
          where cp.conversation_id = c.id and cp.user_id = auth.uid()
        )
      )
  )
);

create policy "Finance roles read school fees" on public.student_fees
for select to authenticated
using (
  public.mobile_current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'COMPTABLE')
  and school_id = public.mobile_current_user_school_id()
);

create policy "Finance roles read school payments" on public.payments
for select to authenticated
using (
  public.mobile_current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'COMPTABLE')
  and school_id = public.mobile_current_user_school_id()
);

create policy "Finance roles read school installments" on public.fee_installments
for select to authenticated
using (
  public.mobile_current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'COMPTABLE')
  and school_id = public.mobile_current_user_school_id()
);
