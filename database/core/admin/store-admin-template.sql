-- PREVIEW-ONLY TEMPLATE.
-- This Store owner account is intentionally pinned. Change these values only in a separately reviewed operation.
\set expected_user_id '721e715a-a520-4d9f-bd7a-2fda083fc5e1'
\set account_identifier '+33656802188@phone.elima'
\set verified_phone '+33656802188'
-- The final ROLLBACK is intentional. Replace it with COMMIT only after explicit authorization.
\set ON_ERROR_STOP on

begin;

create temporary table selected_store_admin on commit drop as
select id, email, phone, email_confirmed_at, phone_confirmed_at, banned_until, deleted_at
from auth.users
where id = :'expected_user_id'::uuid
  and lower(coalesce(email, '')) = lower(:'account_identifier');

do $$
begin
  if (select count(*) from selected_store_admin) <> 1 then
    raise exception 'Expected exactly one existing Elima account';
  end if;
  if exists (select 1 from selected_store_admin where email_confirmed_at is null or banned_until > now() or deleted_at is not null) then
    raise exception 'The selected Elima account is not active and confirmed';
  end if;
  if not exists (
    select 1 from public.auth_flow_authorizations
    where phone = :'verified_phone'
      and purpose = 'phone_control'
      and consumed_at is not null
      and consumed_at >= now() - interval '30 minutes'
  ) then
    raise exception 'A recent successful Twilio phone-control proof is required';
  end if;
end
$$;

insert into public.store_staff (user_id, role, status)
select id, 'store_admin', 'active'
from selected_store_admin
on conflict (user_id) do update
set role = excluded.role,
    status = excluded.status,
    updated_at = now();

select staff.user_id, staff.role, staff.status, candidate.email, candidate.phone, candidate.email_confirmed_at, candidate.phone_confirmed_at
from public.store_staff staff
join selected_store_admin candidate on candidate.id = staff.user_id;

rollback;
