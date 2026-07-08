-- schools.current_term_id is referenced by dashboard settings and cockpit.
alter table public.schools
  add column if not exists current_term_id uuid references public.terms(id);

create index if not exists idx_schools_current_term_id on public.schools(current_term_id);
