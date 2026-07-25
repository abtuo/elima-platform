-- Allow teachers to submit supply lists for admin validation before publication.
alter table public.supply_lists drop constraint if exists supply_lists_status_check;
alter table public.supply_lists
  add constraint supply_lists_status_check
  check (status in ('draft', 'pending_validation', 'published'));
