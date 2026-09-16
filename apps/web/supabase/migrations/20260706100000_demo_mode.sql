-- Demo mode support.
-- Additive only: marks demo schools and enriches the existing messaging model.

alter table public.schools add column if not exists is_demo boolean not null default false;
alter table public.schools add column if not exists demo_slug text;

create unique index if not exists uq_schools_demo_slug
  on public.schools(demo_slug)
  where demo_slug is not null;

alter table public.conversations add column if not exists type text not null default 'parent_admin';
alter table public.conversations add column if not exists student_id uuid references public.students(id) on delete set null;
alter table public.conversations add column if not exists class_id uuid references public.classes(id) on delete set null;
alter table public.conversations add column if not exists is_demo boolean not null default false;
alter table public.conversations add column if not exists updated_at timestamptz not null default now();
alter table public.conversations add column if not exists last_message_at timestamptz;

alter table public.messages add column if not exists sender_role text;
alter table public.messages add column if not exists type text not null default 'text';
alter table public.messages add column if not exists metadata jsonb;
alter table public.messages add column if not exists is_demo boolean not null default false;
alter table public.messages add column if not exists read_by jsonb not null default '[]'::jsonb;

create index if not exists idx_schools_is_demo on public.schools(is_demo);
create index if not exists idx_conversations_school_demo on public.conversations(school_id, is_demo);
create index if not exists idx_conversations_student on public.conversations(student_id);
create index if not exists idx_conversations_class on public.conversations(class_id);
create index if not exists idx_conversations_last_message on public.conversations(last_message_at desc);
create index if not exists idx_messages_conversation_created on public.messages(conversation_id, created_at);

create or replace function public.set_elima_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at
before update on public.conversations
for each row execute function public.set_elima_updated_at();

create or replace function public.touch_conversation_last_message()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_messages_touch_conversation on public.messages;
create trigger trg_messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation_last_message();
