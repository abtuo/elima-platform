-- Revision only. Receipts make refunds atomic, idempotent and tied to the original UTC bucket.
begin;
create table public.revision_quota_reservations (
  id uuid primary key default gen_random_uuid(),
  identity_user_id uuid not null references public.revision_subscriptions(identity_user_id),
  feature text not null,
  period timestamptz not null,
  refunded boolean not null default false
);
alter table public.revision_quota_reservations enable row level security;
revoke all on public.revision_quota_reservations from anon, authenticated;
grant all on public.revision_quota_reservations to service_role;
create function public.revision_reserve_quota(p_identity uuid,p_feature text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb; receipt uuid;
begin
  if p_feature is null then raise exception 'invalid_feature'; end if;
  result:=public.revision_entitlement(p_identity,p_feature);
  if (result->>'allowed')::boolean then
    insert into public.revision_quota_reservations(identity_user_id,feature,period)
      values(p_identity,p_feature,date_trunc('day',now() at time zone 'UTC') at time zone 'UTC') returning id into receipt;
  end if;
  return result || jsonb_build_object('reservationId',receipt);
end $$;
create function public.revision_refund_quota(p_reservation uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare receipt public.revision_quota_reservations;
begin
  select * into receipt from public.revision_quota_reservations where id=p_reservation;
  if not found then return false; end if;
  perform 1 from public.revision_subscriptions where identity_user_id=receipt.identity_user_id for update;
  update public.revision_quota_reservations set refunded=true where id=p_reservation and not refunded returning * into receipt;
  if not found then return false; end if;
  update public.revision_usage set count=greatest(0,count-1)
    where identity_user_id=receipt.identity_user_id and feature=receipt.feature and period=receipt.period;
  return true;
end $$;
revoke all on function public.revision_reserve_quota(uuid,text),public.revision_refund_quota(uuid) from public,anon,authenticated;
grant execute on function public.revision_reserve_quota(uuid,text),public.revision_refund_quota(uuid) to service_role;
commit;
