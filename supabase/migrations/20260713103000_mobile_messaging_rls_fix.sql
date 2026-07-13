-- Corrige la récursion RLS conversations <-> conversation_participants.
-- Aucun contenu métier n'est modifié ou supprimé.

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
    where c.id = target_conversation_id
      and c.school_id = public.mobile_current_user_school_id()
      and (
        public.mobile_is_school_staff()
        or exists (
          select 1 from public.conversation_participants cp
          where cp.conversation_id = c.id
            and cp.participant_type = 'USER'
            and cp.user_id = auth.uid()
        )
        or exists (
          select 1
          from public.conversation_participants cp
          join public.students s on s.class_id = cp.class_id
          where cp.conversation_id = c.id
            and cp.participant_type = 'CLASS'
            and s.user_id = auth.uid()
        )
      )
  );
$$;

drop policy if exists "Members read school conversations" on public.conversations;
create policy "Members read school conversations" on public.conversations
for select to authenticated
using (public.mobile_can_access_conversation(id));

drop policy if exists "Members read own conversation memberships" on public.conversation_participants;
create policy "Members read own conversation memberships" on public.conversation_participants
for select to authenticated
using (public.mobile_can_access_conversation(conversation_id));

drop policy if exists "Members read accessible messages" on public.messages;
create policy "Members read accessible messages" on public.messages
for select to authenticated
using (public.mobile_can_access_conversation(conversation_id));

create or replace function public.mobile_mark_all_messages_read()
returns void
language sql
security definer
set search_path = public
as $$
  update public.messages m
  set read_by = coalesce(m.read_by, '[]'::jsonb) || jsonb_build_array(auth.uid())
  where public.mobile_can_access_conversation(m.conversation_id)
    and m.sender_id is distinct from auth.uid()
    and not coalesce(m.read_by, '[]'::jsonb) @> jsonb_build_array(auth.uid());
$$;

revoke all on function public.mobile_mark_all_messages_read() from public;
grant execute on function public.mobile_mark_all_messages_read() to authenticated;
