-- Séparation alertes / conversations et suppression personnelle.

create table if not exists public.user_hidden_conversations (
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, conversation_id)
);

alter table public.user_hidden_conversations enable row level security;

drop policy if exists "Users manage own hidden conversations" on public.user_hidden_conversations;
create policy "Users manage own hidden conversations"
on public.user_hidden_conversations
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.mobile_is_alert_conversation_type(conversation_type text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(conversation_type, '') = any (array[
    'absence_notification',
    'grade_notification',
    'payment_reminder',
    'schedule_update',
    'class_announcement',
    'store_order'
  ]::text[]);
$$;

create or replace function public.mobile_conversation_is_hidden(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_hidden_conversations hidden
    where hidden.user_id = auth.uid()
      and hidden.conversation_id = target_conversation_id
  );
$$;

revoke all on function public.mobile_is_alert_conversation_type(text) from public;
revoke all on function public.mobile_conversation_is_hidden(uuid) from public;
grant execute on function public.mobile_is_alert_conversation_type(text) to authenticated;
grant execute on function public.mobile_conversation_is_hidden(uuid) to authenticated;

drop policy if exists "Members read relevant conversations" on public.conversations;
create policy "Members read relevant conversations" on public.conversations
for select to authenticated
using (
  public.mobile_can_access_conversation(id)
  and not public.mobile_conversation_is_hidden(id)
);

drop policy if exists "Members read relevant conversation memberships" on public.conversation_participants;
create policy "Members read relevant conversation memberships" on public.conversation_participants
for select to authenticated
using (
  public.mobile_can_access_conversation(conversation_id)
  and not public.mobile_conversation_is_hidden(conversation_id)
);

drop policy if exists "Members read relevant messages" on public.messages;
create policy "Members read relevant messages" on public.messages
for select to authenticated
using (
  public.mobile_can_access_conversation(conversation_id)
  and not public.mobile_conversation_is_hidden(conversation_id)
);

create or replace function public.mobile_hide_conversation(target_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.mobile_can_access_conversation(target_conversation_id) then
    raise exception 'Access denied';
  end if;

  insert into public.user_hidden_conversations (user_id, conversation_id)
  values (auth.uid(), target_conversation_id)
  on conflict (user_id, conversation_id)
  do update set hidden_at = now();
end;
$$;

create or replace function public.mobile_send_message(
  target_conversation_id uuid,
  message_content text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_message_id uuid;
  target_type text;
begin
  if length(trim(coalesce(message_content, ''))) = 0 then
    raise exception 'Message empty';
  end if;
  if length(trim(message_content)) > 4000 then
    raise exception 'Message too long';
  end if;
  if not public.mobile_can_access_conversation(target_conversation_id)
    or public.mobile_conversation_is_hidden(target_conversation_id) then
    raise exception 'Access denied';
  end if;

  select type into target_type
  from public.conversations
  where id = target_conversation_id;

  if public.mobile_is_alert_conversation_type(target_type) then
    raise exception 'Alerts do not accept replies';
  end if;

  insert into public.messages (conversation_id, sender_id, content)
  values (target_conversation_id, auth.uid(), trim(message_content))
  returning id into created_message_id;

  return created_message_id;
end;
$$;

revoke all on function public.mobile_hide_conversation(uuid) from public;
revoke all on function public.mobile_send_message(uuid, text) from public;
grant execute on function public.mobile_hide_conversation(uuid) to authenticated;
grant execute on function public.mobile_send_message(uuid, text) to authenticated;
