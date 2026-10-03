-- TARGET: Revision rydnrvvmwixrkmnvpajf ONLY, not Identity.
begin;
create table public.revision_subscriptions (
  identity_user_id uuid primary key,
  plan text not null default 'free' check (plan in ('free','standard','premium')),
  provider text,
  product_id text,
  purchase_token text unique,
  status text not null default 'expired' check (status in ('trial','active','grace_period','on_hold','canceled_but_active','expired','revoked')),
  trial_started_at timestamptz,
  trial_end_at timestamptz,
  trial_used_at timestamptz,
  trial_purchase_token text,
  current_period_end timestamptz,
  purchase_started_at timestamptz,
  auto_renewing boolean not null default false,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);
create table public.revision_play_purchases (
  purchase_token text primary key,
  identity_user_id uuid not null references public.revision_subscriptions(identity_user_id),
  superseded_by text,
  created_at timestamptz not null default now()
);
create table public.revision_usage (
  identity_user_id uuid not null references public.revision_subscriptions(identity_user_id),
  feature text not null check (feature in ('ai_quiz','ai_flashcard','document_scan','ai_hint')),
  period timestamptz not null,
  count integer not null default 0 check (count >= 0),
  primary key(identity_user_id,feature,period)
);
-- Billing records/tokens are server-only, including reads. No client writes.
alter table public.revision_subscriptions enable row level security;
alter table public.revision_play_purchases enable row level security;
alter table public.revision_usage enable row level security;
revoke all on public.revision_subscriptions, public.revision_play_purchases, public.revision_usage from anon, authenticated;
grant all on public.revision_subscriptions, public.revision_play_purchases, public.revision_usage to service_role;

-- One row lock serializes entitlement changes and all consumption for an identity.
-- NULL feature reads; only the backend may select the feature to consume.
create function public.revision_entitlement(p_identity uuid, p_feature text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s public.revision_subscriptions; f text; lim int; used int; bucket timestamptz;
  reset_at timestamptz; weekly boolean; result jsonb := '{}'::jsonb; allowed boolean := true;
begin
  if p_feature is not null and p_feature not in ('ai_quiz','ai_flashcard','document_scan','ai_hint') then raise exception 'invalid_feature'; end if;
  insert into public.revision_subscriptions(identity_user_id) values(p_identity) on conflict do nothing;
  select * into s from public.revision_subscriptions where identity_user_id=p_identity for update;
  if s.plan <> 'free' and (s.current_period_end is null or s.current_period_end <= now() or s.status not in ('trial','active','grace_period','canceled_but_active')) then
    update public.revision_subscriptions set plan='free', status=case when current_period_end<=now() and status not in ('revoked','on_hold') then 'expired' else status end, updated_at=now() where identity_user_id=p_identity returning * into s;
  end if;
  foreach f in array array['ai_quiz','ai_flashcard','document_scan','ai_hint'] loop
    weekly := s.plan='free' and f in ('ai_flashcard','document_scan');
    bucket := date_trunc(case when weekly then 'week' else 'day' end, now() at time zone 'UTC') at time zone 'UTC';
    reset_at := bucket + case when weekly then interval '7 days' else interval '1 day' end;
    lim := case s.plan
      when 'premium' then case f when 'ai_quiz' then 500 when 'ai_flashcard' then 200 when 'document_scan' then 100 else 1000 end
      when 'standard' then case f when 'ai_quiz' then 10 when 'ai_hint' then 25 else 3 end
      else case f when 'ai_hint' then 5 else 2 end end;
    -- Counts are stored daily even for weekly plans: changing plans never resets usage.
    select coalesce(sum(count),0)::int into used from public.revision_usage where identity_user_id=p_identity and feature=f and period>=bucket and period<reset_at;
    if p_feature=f then
      if used>=lim then allowed:=false;
      else
        insert into public.revision_usage(identity_user_id,feature,period,count)
          values(p_identity,f,date_trunc('day',now() at time zone 'UTC') at time zone 'UTC',1)
          on conflict(identity_user_id,feature,period) do update set count=revision_usage.count+1;
        used:=used+1;
      end if;
    end if;
    result := result || jsonb_build_object(f,jsonb_build_object('used',used,'limit',case when s.plan='premium' then null else lim end,'remaining',greatest(0,lim-used),'unlimited',s.plan='premium','resetAt',reset_at,'period',case when weekly then 'week' else 'day' end));
  end loop;
  return jsonb_build_object('allowed',allowed,'feature',p_feature,'plan',s.plan,'status',s.status,'trialUsed',s.trial_used_at is not null,'currentPeriodEnd',s.current_period_end,'autoRenewing',s.auto_renewing,'usage',result);
end $$;

-- Snapshot comes exclusively from subscriptionsv2.get, never a client payload.
create function public.revision_apply_play_purchase(p_identity uuid,p_token text,p_linked_token text,p_snapshot jsonb,p_verified_at timestamptz)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare s public.revision_subscriptions; owner uuid; replaced text; is_trial boolean := coalesce((p_snapshot->>'usedTrial')::boolean,false);
begin
  insert into public.revision_subscriptions(identity_user_id) values(p_identity) on conflict do nothing;
  select * into s from public.revision_subscriptions where identity_user_id=p_identity for update;
  insert into public.revision_play_purchases(purchase_token,identity_user_id) values(p_token,p_identity) on conflict do nothing;
  select identity_user_id,superseded_by into owner,replaced from public.revision_play_purchases where purchase_token=p_token for update;
  if owner<>p_identity then raise exception 'purchase_owner_mismatch'; end if;
  if replaced is not null then return; end if;
  if s.verified_at>p_verified_at then return; end if;
  if s.purchase_token is not null and s.purchase_token<>p_token then
    if s.purchase_token is distinct from p_linked_token and (s.current_period_end>now() or (p_snapshot->>'startedAt')::timestamptz<s.purchase_started_at) then raise exception 'subscription_conflict'; end if;
    update public.revision_play_purchases set superseded_by=p_token where purchase_token=s.purchase_token;
  end if;
  if is_trial and s.trial_used_at is not null and s.trial_purchase_token is distinct from p_token then raise exception 'trial_already_used'; end if;
  update public.revision_subscriptions set
    plan=p_snapshot->>'plan',provider='google_play',product_id=p_snapshot->>'productId',purchase_token=p_token,status=case when s.status='revoked' and s.purchase_token=p_token and p_snapshot->>'status'='expired' then 'revoked' else p_snapshot->>'status' end,
    current_period_end=(p_snapshot->>'periodEnd')::timestamptz,auto_renewing=(p_snapshot->>'autoRenewing')::boolean,verified_at=p_verified_at,
    purchase_started_at=(p_snapshot->>'startedAt')::timestamptz,
    trial_used_at=case when is_trial then coalesce(trial_used_at,now()) else trial_used_at end,
    trial_purchase_token=case when is_trial then coalesce(trial_purchase_token,p_token) else trial_purchase_token end,
    trial_started_at=case when is_trial then coalesce(trial_started_at,(p_snapshot->>'startedAt')::timestamptz) else trial_started_at end,
    trial_end_at=case when coalesce((p_snapshot->>'trial')::boolean,false) then (p_snapshot->>'periodEnd')::timestamptz else trial_end_at end,updated_at=now()
    where identity_user_id=p_identity;
end $$;
revoke all on function public.revision_entitlement(uuid,text),public.revision_apply_play_purchase(uuid,text,text,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.revision_entitlement(uuid,text),public.revision_apply_play_purchase(uuid,text,text,jsonb,timestamptz) to service_role;
commit;
