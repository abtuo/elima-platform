alter table public.timetable_events add column if not exists status text not null default 'scheduled';
alter table public.timetable_events add column if not exists original_starts_at timestamptz;
alter table public.timetable_events add column if not exists original_ends_at timestamptz;
alter table public.timetable_events add column if not exists change_reason text;
alter table public.timetable_events add column if not exists change_message text;
alter table public.timetable_events add column if not exists changed_at timestamptz;
alter table public.timetable_events add column if not exists changed_by uuid references public.users(id) on delete set null;
alter table public.timetable_events add column if not exists cancelled_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'timetable_events_status_check'
      and conrelid = 'public.timetable_events'::regclass
  ) then
    alter table public.timetable_events
      add constraint timetable_events_status_check
      check (status in ('scheduled', 'moved', 'cancelled'));
  end if;
end$$;

create index if not exists idx_timetable_events_teacher_starts
  on public.timetable_events(school_id, teacher_id, starts_at);

create index if not exists idx_timetable_events_class_starts
  on public.timetable_events(school_id, class_id, starts_at);
