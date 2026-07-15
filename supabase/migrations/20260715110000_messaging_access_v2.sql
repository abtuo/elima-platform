-- Messagerie mobile v2.
-- Un professeur ne lit que les conversations où il est participant ou celles
-- d'une classe qui lui est réellement affectée. Seuls SCHOOL_ADMIN et
-- SUPER_ADMIN peuvent ouvrir la vue complète de leur établissement.

create or replace function public.mobile_is_school_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.role in ('SUPER_ADMIN', 'SCHOOL_ADMIN') from public.users u where u.id = auth.uid()),
    false
  );
$$;

create or replace function public.mobile_teacher_has_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teachers t
    where t.user_id = auth.uid()
      and (
        exists (select 1 from public.class_teachers ct where ct.teacher_id = t.id and ct.class_id = target_class_id)
        or exists (select 1 from public.teacher_subject_classes tsc where tsc.teacher_id = t.id and tsc.class_id = target_class_id)
      )
  );
$$;

create or replace function public.mobile_family_has_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    where s.id = target_student_id
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

create or replace function public.mobile_family_has_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    where s.class_id = target_class_id
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

create or replace function public.mobile_can_access_conversation(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    join public.users actor on actor.id = auth.uid()
    where c.id = target_conversation_id
      and c.school_id = actor.school_id
      and (
        actor.role in ('SUPER_ADMIN', 'SCHOOL_ADMIN')
        or exists (
          select 1
          from public.conversation_participants cp
          where cp.conversation_id = c.id
            and cp.participant_type = 'USER'
            and cp.user_id = auth.uid()
        )
        or (
          actor.role = 'TEACHER'
          and c.type in (
            'teacher_student',
            'parent_teacher',
            'class_announcement',
            'schedule_update',
            'supply_list_review',
            'grade_notification',
            'absence_notification'
          )
          and (
            (c.class_id is not null and public.mobile_teacher_has_class(c.class_id))
            or (
              c.student_id is not null
              and exists (
                select 1 from public.students s
                where s.id = c.student_id and public.mobile_teacher_has_class(s.class_id)
              )
            )
            or exists (
              select 1
              from public.conversation_participants cp
              where cp.conversation_id = c.id
                and cp.participant_type = 'CLASS'
                and public.mobile_teacher_has_class(cp.class_id)
            )
          )
        )
        or (
          actor.role in ('PARENT', 'STUDENT')
          and (
            (c.student_id is not null and public.mobile_family_has_student(c.student_id))
            or (c.class_id is not null and public.mobile_family_has_class(c.class_id))
            or exists (
              select 1
              from public.conversation_participants cp
              where cp.conversation_id = c.id
                and cp.participant_type = 'CLASS'
                and public.mobile_family_has_class(cp.class_id)
            )
          )
        )
      )
  );
$$;

revoke all on function public.mobile_is_school_admin() from public;
revoke all on function public.mobile_teacher_has_class(uuid) from public;
revoke all on function public.mobile_family_has_student(uuid) from public;
revoke all on function public.mobile_family_has_class(uuid) from public;
revoke all on function public.mobile_can_access_conversation(uuid) from public;
grant execute on function public.mobile_is_school_admin() to authenticated;
grant execute on function public.mobile_teacher_has_class(uuid) to authenticated;
grant execute on function public.mobile_family_has_student(uuid) to authenticated;
grant execute on function public.mobile_family_has_class(uuid) to authenticated;
grant execute on function public.mobile_can_access_conversation(uuid) to authenticated;

drop policy if exists "Members read school conversations" on public.conversations;
drop policy if exists "Members read own conversation memberships" on public.conversation_participants;
drop policy if exists "Members read accessible messages" on public.messages;

create policy "Members read relevant conversations" on public.conversations
for select to authenticated
using (public.mobile_can_access_conversation(id));

create policy "Members read relevant conversation memberships" on public.conversation_participants
for select to authenticated
using (public.mobile_can_access_conversation(conversation_id));

create policy "Members read relevant messages" on public.messages
for select to authenticated
using (public.mobile_can_access_conversation(conversation_id));

drop function if exists public.mobile_mark_all_messages_read();

create or replace function public.mobile_mark_messages_read(target_conversation_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.messages m
  set read_by = coalesce(m.read_by, '[]'::jsonb) || jsonb_build_array(auth.uid())
  where m.conversation_id = any(target_conversation_ids)
    and public.mobile_can_access_conversation(m.conversation_id)
    and m.sender_id is distinct from auth.uid()
    and not coalesce(m.read_by, '[]'::jsonb) @> jsonb_build_array(auth.uid());
$$;

revoke all on function public.mobile_mark_messages_read(uuid[]) from public;
grant execute on function public.mobile_mark_messages_read(uuid[]) to authenticated;

create or replace function public.mobile_log_school_message_access()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_school_id uuid;
begin
  if not public.mobile_is_school_admin() then
    raise exception 'Access denied';
  end if;

  select school_id into actor_school_id from public.users where id = auth.uid();
  insert into public.audit_logs (school_id, user_id, action, entity_type)
  values (actor_school_id, auth.uid(), 'MESSAGING_VIEW_ALL', 'messages');
end;
$$;

revoke all on function public.mobile_log_school_message_access() from public;
grant execute on function public.mobile_log_school_message_access() to authenticated;
