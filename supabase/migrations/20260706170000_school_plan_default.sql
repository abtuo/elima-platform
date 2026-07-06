update public.schools set plan = 'basic' where plan is null;
alter table public.schools alter column plan set default 'basic';
