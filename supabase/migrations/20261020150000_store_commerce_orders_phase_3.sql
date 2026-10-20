-- Elima Store Phase 3 — commandes et paiement à la livraison.
-- Migration additive : aucun prestataire de paiement et aucun tarif commercial implicite.

alter table public.store_staff drop constraint if exists store_staff_role_check;
alter table public.store_staff add constraint store_staff_role_check
  check (role in ('store_admin','catalog_manager','inventory_manager','order_manager'));

alter table public.store_product_variants
  add column if not exists quantity_reserved integer not null default 0 check (quantity_reserved >= 0),
  add constraint store_variant_reserved_within_stock check (quantity_reserved <= quantity_available);

alter table public.store_inventory_adjustments drop constraint if exists store_inventory_adjustments_reason_check;
alter table public.store_inventory_adjustments add constraint store_inventory_adjustments_reason_check
  check (reason in ('initial','manual_correction','restock','damage','other','order_fulfilled'));

create table public.store_delivery_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('home_delivery','pickup')),
  name text not null,
  description text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_delivery_zones (
  id uuid primary key default gen_random_uuid(),
  method_id uuid not null references public.store_delivery_methods(id) on delete restrict,
  name text not null,
  city text not null,
  commune text,
  fee_amount bigint not null check (fee_amount >= 0),
  currency text not null default 'XOF' check (currency = 'XOF'),
  conditions text,
  estimated_delay text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (method_id, name)
);

create table public.store_pickup_points (
  id uuid primary key default gen_random_uuid(),
  method_id uuid not null references public.store_delivery_methods(id) on delete restrict,
  zone_id uuid references public.store_delivery_zones(id) on delete restrict,
  name text not null,
  address_details text not null,
  landmark text,
  phone text,
  opening_hours text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Adresse',
  recipient_name text not null,
  phone text not null,
  country_code text not null default 'CI' check (country_code ~ '^[A-Z]{2}$'),
  city text not null,
  commune text not null,
  neighborhood text not null,
  address_details text not null,
  landmark text,
  instructions text,
  delivery_zone_id uuid references public.store_delivery_zones(id) on delete set null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index store_customer_one_default_address on public.store_customer_addresses(customer_id) where is_default;
create index store_customer_addresses_owner on public.store_customer_addresses(customer_id, created_at desc);

create table public.store_commerce_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('ELS-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,16))),
  customer_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending_confirmation' check (status in ('pending_confirmation','confirmed','preparing','out_for_delivery','delivered','delivery_failed','not_collected','cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','partial','paid')),
  payment_method text not null default 'cash_on_delivery' check (payment_method = 'cash_on_delivery'),
  currency text not null default 'XOF' check (currency = 'XOF'),
  subtotal_amount bigint not null check (subtotal_amount >= 0),
  delivery_fee_amount bigint not null check (delivery_fee_amount >= 0),
  total_amount bigint not null check (total_amount = subtotal_amount + delivery_fee_amount),
  delivery_mode text not null check (delivery_mode in ('home_delivery','pickup')),
  delivery_method_id uuid not null references public.store_delivery_methods(id) on delete restrict,
  delivery_zone_id uuid references public.store_delivery_zones(id) on delete restrict,
  pickup_point_id uuid references public.store_pickup_points(id) on delete restrict,
  customer_address_id uuid references public.store_customer_addresses(id) on delete set null,
  delivery_zone_name text,
  delivery_address_snapshot jsonb not null check (jsonb_typeof(delivery_address_snapshot) = 'object'),
  customer_phone text not null,
  notes text,
  internal_notes text,
  idempotency_key uuid not null,
  confirmed_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, idempotency_key),
  check ((delivery_mode = 'home_delivery' and delivery_zone_id is not null and customer_address_id is not null and pickup_point_id is null)
    or (delivery_mode = 'pickup' and pickup_point_id is not null))
);
create index store_commerce_orders_customer_created on public.store_commerce_orders(customer_id, created_at desc);
create index store_commerce_orders_admin_queue on public.store_commerce_orders(status, created_at desc);

create table public.store_commerce_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_commerce_orders(id) on delete restrict,
  item_type text not null check (item_type in ('product','kit')),
  product_id uuid references public.store_catalog_products(id) on delete set null,
  kit_id uuid references public.store_catalog_kits(id) on delete set null,
  variant_id uuid references public.store_product_variants(id) on delete set null,
  seller_id uuid references public.store_sellers(id) on delete set null,
  name_snapshot text not null,
  variant_snapshot text,
  sku_snapshot text not null,
  image_snapshot text,
  quantity integer not null check (quantity > 0),
  unit_price_amount bigint not null check (unit_price_amount >= 0),
  line_total_amount bigint not null check (line_total_amount = unit_price_amount * quantity),
  currency text not null default 'XOF' check (currency = 'XOF'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  check ((item_type = 'product' and product_id is not null and variant_id is not null and kit_id is null)
    or (item_type = 'kit' and kit_id is not null and product_id is null))
);
create index store_commerce_order_items_order on public.store_commerce_order_items(order_id);

create table public.store_inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_commerce_orders(id) on delete restrict,
  order_item_id uuid not null references public.store_commerce_order_items(id) on delete restrict,
  variant_id uuid not null references public.store_product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  status text not null default 'active' check (status in ('active','released','consumed','review_required')),
  expires_at timestamptz,
  released_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_item_id, variant_id)
);
create index store_reservations_active_variant on public.store_inventory_reservations(variant_id) where status = 'active';

create table public.store_order_status_history (
  id bigint generated by default as identity primary key,
  order_id uuid not null references public.store_commerce_orders(id) on delete restrict,
  from_status text,
  to_status text not null,
  reason text,
  changed_by uuid references auth.users(id) on delete set null,
  actor_type text not null check (actor_type in ('customer','store_staff','system')),
  created_at timestamptz not null default now()
);
create index store_order_history_order on public.store_order_status_history(order_id, created_at);

create table public.store_order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.store_commerce_orders(id) on delete restrict,
  status text not null default 'collected' check (status = 'collected'),
  amount_collected bigint not null check (amount_collected >= 0),
  currency text not null default 'XOF' check (currency = 'XOF'),
  collection_method text not null check (collection_method in ('cash','mobile_money','bank_transfer','other')),
  collected_at timestamptz not null,
  confirmed_by uuid not null references auth.users(id) on delete restrict,
  internal_reference text,
  variance_reason text,
  created_at timestamptz not null default now()
);

create table public.store_delivery_events (
  id bigint generated by default as identity primary key,
  order_id uuid not null references public.store_commerce_orders(id) on delete restrict,
  event_type text not null check (event_type in ('assigned','dispatched','delivered','failed','not_collected','note')),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.store_notification_outbox (
  id bigint generated by default as identity primary key,
  order_id uuid not null references public.store_commerce_orders(id) on delete restrict,
  event_type text not null check (event_type in ('order_created','order_confirmed','order_dispatched','order_delivered','order_cancelled')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','sent','failed','disabled')),
  provider_reference text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

insert into public.store_delivery_methods(code,name,description,is_active) values
  ('home_delivery','Livraison à domicile','Livraison dans une zone configurée.',true),
  ('pickup','Retrait en point de collecte','Disponible uniquement lorsqu’un point réel est activé.',false)
on conflict (code) do nothing;

create or replace function public.store_effective_price(p_price bigint, p_promotional bigint, p_starts timestamptz, p_ends timestamptz)
returns bigint language sql stable as $$
  select case when p_promotional is not null and (p_starts is null or p_starts <= now()) and (p_ends is null or p_ends > now())
    then p_promotional else p_price end;
$$;

create or replace function public.quote_store_checkout(
  p_cart jsonb,
  p_delivery_mode text,
  p_address_id uuid default null,
  p_delivery_zone_id uuid default null,
  p_pickup_point_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid(); entry jsonb; component record; selected record; address_row record;
  lines jsonb := '[]'::jsonb; requirements jsonb := '{}'::jsonb;
  item_quantity integer; needed integer; unit_price bigint; subtotal bigint := 0; fee bigint := 0;
  method_row public.store_delivery_methods%rowtype; zone_row public.store_delivery_zones%rowtype; point_row public.store_pickup_points%rowtype;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if jsonb_typeof(p_cart) <> 'array' or jsonb_array_length(p_cart) = 0 or jsonb_array_length(p_cart) > 100 then raise exception 'EMPTY_OR_INVALID_CART'; end if;
  select * into method_row from public.store_delivery_methods where code = p_delivery_mode and is_active;
  if not found then raise exception 'DELIVERY_METHOD_UNAVAILABLE'; end if;
  if p_delivery_mode = 'home_delivery' then
    select * into address_row from public.store_customer_addresses where id = p_address_id and customer_id = uid;
    if not found then raise exception 'ADDRESS_NOT_AUTHORIZED'; end if;
    select * into zone_row from public.store_delivery_zones where id = p_delivery_zone_id and method_id = method_row.id and is_active;
    if not found or address_row.delivery_zone_id is distinct from zone_row.id then raise exception 'DELIVERY_ZONE_UNAVAILABLE'; end if;
    fee := zone_row.fee_amount;
  elsif p_delivery_mode = 'pickup' then
    select * into point_row from public.store_pickup_points where id = p_pickup_point_id and method_id = method_row.id and is_active;
    if not found then raise exception 'PICKUP_POINT_UNAVAILABLE'; end if;
    if point_row.zone_id is not null then select * into zone_row from public.store_delivery_zones where id = point_row.zone_id and is_active; end if;
    fee := coalesce(zone_row.fee_amount,0);
  else raise exception 'DELIVERY_METHOD_UNAVAILABLE'; end if;

  for entry in select value from jsonb_array_elements(p_cart) loop
    item_quantity := nullif(entry->>'quantity','')::integer;
    if item_quantity is null or item_quantity < 1 or item_quantity > 99 then raise exception 'INVALID_QUANTITY'; end if;
    if coalesce(entry->>'itemType','product') = 'product' then
      select p.id product_id,p.name,p.status product_status,p.seller_id,v.id variant_id,v.name variant_name,v.sku,v.status variant_status,
        v.quantity_available,v.quantity_reserved,v.availability,
        public.store_effective_price(v.price_amount,v.promotional_price_amount,v.promotion_starts_at,v.promotion_ends_at) price
      into selected from public.store_catalog_products p join public.store_product_variants v on v.product_id=p.id
      where p.id=(entry->>'productId')::uuid and v.id=(entry->>'variantId')::uuid;
      if not found or selected.product_status <> 'active' or selected.variant_status <> 'active' or selected.availability not in ('in_stock','available_on_order') then raise exception 'ITEM_UNAVAILABLE'; end if;
      needed := coalesce((requirements->>selected.variant_id::text)::integer,0) + item_quantity;
      if selected.quantity_available - selected.quantity_reserved < needed then raise exception 'INSUFFICIENT_STOCK:%',selected.name; end if;
      requirements := jsonb_set(requirements,array[selected.variant_id::text],to_jsonb(needed),true);
      unit_price := selected.price; subtotal := subtotal + unit_price * item_quantity;
      lines := lines || jsonb_build_array(jsonb_build_object('itemType','product','productId',selected.product_id,'variantId',selected.variant_id,'sellerId',selected.seller_id,'name',selected.name,'variantName',selected.variant_name,'sku',selected.sku,'quantity',item_quantity,'unitPrice',unit_price,'lineTotal',unit_price*item_quantity,'reservations',jsonb_build_array(jsonb_build_object('variantId',selected.variant_id,'quantity',item_quantity))));
    elsif entry->>'itemType' = 'kit' then
      select k.id kit_id,k.name,k.slug,k.status,k.availability,k.seller_id,k.pricing_strategy,k.fixed_price_amount
      into selected from public.store_catalog_kits k where k.id=(entry->>'kitId')::uuid;
      if not found or selected.status <> 'active' or selected.availability not in ('in_stock','available_on_order') then raise exception 'ITEM_UNAVAILABLE'; end if;
      unit_price := 0;
      for component in select i.quantity component_quantity,v.id variant_id,v.sku,v.name variant_name,v.quantity_available,v.quantity_reserved,v.availability,v.status,
          public.store_effective_price(v.price_amount,v.promotional_price_amount,v.promotion_starts_at,v.promotion_ends_at) price
        from public.store_kit_items i join public.store_product_variants v on v.id=coalesce(i.variant_id,(select d.id from public.store_product_variants d where d.product_id=i.product_id and d.is_default and d.status='active' limit 1))
        where i.kit_id=selected.kit_id order by i.sort_order
      loop
        if component.status <> 'active' or component.availability not in ('in_stock','available_on_order') then raise exception 'KIT_COMPONENT_UNAVAILABLE'; end if;
        needed := coalesce((requirements->>component.variant_id::text)::integer,0) + component.component_quantity * item_quantity;
        if component.quantity_available - component.quantity_reserved < needed then raise exception 'KIT_COMPONENT_UNAVAILABLE'; end if;
        requirements := jsonb_set(requirements,array[component.variant_id::text],to_jsonb(needed),true);
        unit_price := unit_price + component.price * component.component_quantity;
      end loop;
      if unit_price = 0 then raise exception 'KIT_EMPTY'; end if;
      if selected.pricing_strategy='fixed' then unit_price:=selected.fixed_price_amount; end if;
      subtotal := subtotal + unit_price * item_quantity;
      lines := lines || jsonb_build_array(jsonb_build_object('itemType','kit','kitId',selected.kit_id,'sellerId',selected.seller_id,'name',selected.name,'sku','KIT-'||upper(selected.slug),'quantity',item_quantity,'unitPrice',unit_price,'lineTotal',unit_price*item_quantity,'reservations',
        (select coalesce(jsonb_agg(jsonb_build_object('variantId',v.id,'quantity',i.quantity*item_quantity) order by i.sort_order),'[]'::jsonb)
         from public.store_kit_items i join public.store_product_variants v on v.id=coalesce(i.variant_id,(select d.id from public.store_product_variants d where d.product_id=i.product_id and d.is_default and d.status='active' limit 1)) where i.kit_id=selected.kit_id)));
    else raise exception 'INVALID_ITEM_TYPE'; end if;
  end loop;
  return jsonb_build_object('currency','XOF','subtotal',subtotal,'deliveryFee',fee,'total',subtotal+fee,'deliveryMode',p_delivery_mode,'deliveryMethodId',method_row.id,'deliveryZoneId',zone_row.id,'deliveryZoneName',zone_row.name,'pickupPointId',point_row.id,'lines',lines);
end;
$$;

create or replace function public.create_store_order(
  p_cart jsonb, p_delivery_mode text, p_address_id uuid, p_delivery_zone_id uuid, p_pickup_point_id uuid,
  p_idempotency_key uuid, p_expected_subtotal bigint, p_expected_delivery_fee bigint, p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare uid uuid:=auth.uid(); quote jsonb; existing record; order_row public.store_commerce_orders%rowtype; address_row record; line jsonb; reservation jsonb; item_id uuid; affected integer; order_phone text;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select id,reference,total_amount,status into existing from public.store_commerce_orders where customer_id=uid and idempotency_key=p_idempotency_key;
  if found then return jsonb_build_object('id',existing.id,'reference',existing.reference,'total',existing.total_amount,'status',existing.status,'duplicate',true); end if;
  quote:=public.quote_store_checkout(p_cart,p_delivery_mode,p_address_id,p_delivery_zone_id,p_pickup_point_id);
  if (quote->>'subtotal')::bigint <> p_expected_subtotal or (quote->>'deliveryFee')::bigint <> p_expected_delivery_fee then raise exception 'CHECKOUT_CHANGED'; end if;
  if p_delivery_mode='home_delivery' then select * into address_row from public.store_customer_addresses where id=p_address_id and customer_id=uid; order_phone:=address_row.phone;
  else select phone into order_phone from auth.users where id=uid; end if;
  insert into public.store_commerce_orders(customer_id,subtotal_amount,delivery_fee_amount,total_amount,delivery_mode,delivery_method_id,delivery_zone_id,pickup_point_id,customer_address_id,delivery_zone_name,delivery_address_snapshot,customer_phone,notes,idempotency_key)
  values(uid,(quote->>'subtotal')::bigint,(quote->>'deliveryFee')::bigint,(quote->>'total')::bigint,p_delivery_mode,(quote->>'deliveryMethodId')::uuid,nullif(quote->>'deliveryZoneId','')::uuid,nullif(quote->>'pickupPointId','')::uuid,p_address_id,quote->>'deliveryZoneName',
    case when p_delivery_mode='home_delivery' then jsonb_build_object('recipientName',address_row.recipient_name,'phone',address_row.phone,'countryCode',address_row.country_code,'city',address_row.city,'commune',address_row.commune,'neighborhood',address_row.neighborhood,'addressDetails',address_row.address_details,'landmark',address_row.landmark,'instructions',address_row.instructions)
      else jsonb_build_object('pickupPointId',quote->>'pickupPointId') end,
    order_phone,nullif(trim(p_notes),''),p_idempotency_key)
  returning * into order_row;
  for line in select value from jsonb_array_elements(quote->'lines') loop
    insert into public.store_commerce_order_items(order_id,item_type,product_id,kit_id,variant_id,seller_id,name_snapshot,variant_snapshot,sku_snapshot,quantity,unit_price_amount,line_total_amount,metadata)
    values(order_row.id,line->>'itemType',nullif(line->>'productId','')::uuid,nullif(line->>'kitId','')::uuid,nullif(line->>'variantId','')::uuid,nullif(line->>'sellerId','')::uuid,line->>'name',line->>'variantName',line->>'sku',(line->>'quantity')::integer,(line->>'unitPrice')::bigint,(line->>'lineTotal')::bigint,jsonb_build_object('reservations',line->'reservations')) returning id into item_id;
    for reservation in select value from jsonb_array_elements(line->'reservations') loop
      update public.store_product_variants set quantity_reserved=quantity_reserved+(reservation->>'quantity')::integer
      where id=(reservation->>'variantId')::uuid and quantity_available-quantity_reserved >= (reservation->>'quantity')::integer;
      get diagnostics affected=row_count; if affected<>1 then raise exception 'INSUFFICIENT_STOCK'; end if;
      insert into public.store_inventory_reservations(order_id,order_item_id,variant_id,quantity,expires_at)
      values(order_row.id,item_id,(reservation->>'variantId')::uuid,(reservation->>'quantity')::integer,now()+interval '48 hours');
    end loop;
  end loop;
  insert into public.store_order_status_history(order_id,to_status,changed_by,actor_type,reason) values(order_row.id,'pending_confirmation',uid,'customer','Commande confirmée par le client');
  insert into public.store_notification_outbox(order_id,event_type,status,payload) values(order_row.id,'order_created','disabled',jsonb_build_object('reference',order_row.reference));
  return jsonb_build_object('id',order_row.id,'reference',order_row.reference,'total',order_row.total_amount,'status',order_row.status,'duplicate',false);
exception when unique_violation then
  select id,reference,total_amount,status into existing from public.store_commerce_orders where customer_id=uid and idempotency_key=p_idempotency_key;
  if found then return jsonb_build_object('id',existing.id,'reference',existing.reference,'total',existing.total_amount,'status',existing.status,'duplicate',true); end if;
  raise;
end;
$$;

create or replace function public.release_store_order_reservations(p_order_id uuid, p_review_required boolean default false)
returns void language plpgsql security definer set search_path=public as $$
declare reservation record;
begin
  for reservation in select * from public.store_inventory_reservations where order_id=p_order_id and status in ('active','review_required') for update loop
    if p_review_required then
      update public.store_inventory_reservations set status='review_required' where id=reservation.id;
    else
      update public.store_product_variants set quantity_reserved=quantity_reserved-reservation.quantity where id=reservation.variant_id and quantity_reserved>=reservation.quantity;
      update public.store_inventory_reservations set status='released',released_at=now() where id=reservation.id;
    end if;
  end loop;
end; $$;

create or replace function public.resolve_store_reservation_review(p_order_id uuid,p_action text,p_reason text)
returns integer language plpgsql security definer set search_path=public as $$
declare reservation record; resolved integer:=0;
begin
  if not public.is_store_staff(array['store_admin','order_manager','inventory_manager']) then raise exception 'INVENTORY_STAFF_REQUIRED'; end if;
  if p_action not in ('release','discard') or nullif(trim(p_reason),'') is null then raise exception 'INVALID_RESERVATION_RESOLUTION'; end if;
  for reservation in select * from public.store_inventory_reservations where order_id=p_order_id and status='review_required' for update loop
    if p_action='release' then
      update public.store_product_variants set quantity_reserved=quantity_reserved-reservation.quantity where id=reservation.variant_id and quantity_reserved>=reservation.quantity;
      update public.store_inventory_reservations set status='released',released_at=now() where id=reservation.id;
    else
      update public.store_product_variants set quantity_available=quantity_available-reservation.quantity,quantity_reserved=quantity_reserved-reservation.quantity where id=reservation.variant_id and quantity_reserved>=reservation.quantity and quantity_available>=reservation.quantity;
      insert into public.store_inventory_adjustments(variant_id,quantity_delta,resulting_quantity,reason,note,adjusted_by)
        select reservation.variant_id,-reservation.quantity,quantity_available,'damage','Commande '||(select reference from public.store_commerce_orders where id=p_order_id)||' · '||trim(p_reason),auth.uid() from public.store_product_variants where id=reservation.variant_id;
      update public.store_inventory_reservations set status='consumed',consumed_at=now() where id=reservation.id;
    end if;
    resolved:=resolved+1;
  end loop;
  if resolved=0 then raise exception 'NO_RESERVATION_TO_REVIEW'; end if;
  insert into public.store_delivery_events(order_id,event_type,note,created_by) values(p_order_id,'note','Résolution stock ('||p_action||') · '||trim(p_reason),auth.uid());
  return resolved;
end; $$;

create or replace function public.cancel_store_order(p_reference text,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); target public.store_commerce_orders%rowtype;
begin
  select * into target from public.store_commerce_orders where reference=p_reference and customer_id=uid for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if target.status not in ('pending_confirmation','confirmed') then raise exception 'CANCELLATION_NOT_ALLOWED'; end if;
  perform public.release_store_order_reservations(target.id,false);
  update public.store_commerce_orders set status='cancelled',cancelled_at=now(),updated_at=now() where id=target.id;
  insert into public.store_order_status_history(order_id,from_status,to_status,reason,changed_by,actor_type) values(target.id,target.status,'cancelled',nullif(trim(p_reason),''),uid,'customer');
  insert into public.store_notification_outbox(order_id,event_type,status,payload) values(target.id,'order_cancelled','disabled',jsonb_build_object('reference',target.reference));
  return jsonb_build_object('reference',target.reference,'status','cancelled');
end; $$;

create or replace function public.transition_store_order(p_order_id uuid,p_to_status text,p_reason text default null,p_release_stock boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare target public.store_commerce_orders%rowtype; allowed boolean:=false; reservation record; event_name text;
begin
  if not public.is_store_staff(array['store_admin','order_manager']) then raise exception 'ORDER_STAFF_REQUIRED'; end if;
  select * into target from public.store_commerce_orders where id=p_order_id for update; if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  allowed := (target.status='pending_confirmation' and p_to_status in ('confirmed','cancelled'))
    or (target.status='confirmed' and p_to_status in ('preparing','cancelled'))
    or (target.status='preparing' and p_to_status in ('out_for_delivery','cancelled'))
    or (target.status='out_for_delivery' and p_to_status in ('delivered','delivery_failed','not_collected'))
    or (target.status in ('delivery_failed','not_collected') and p_to_status='cancelled');
  if not allowed then raise exception 'INVALID_ORDER_TRANSITION'; end if;
  if p_to_status='delivered' then
    for reservation in select * from public.store_inventory_reservations where order_id=target.id and status='active' for update loop
      update public.store_product_variants set quantity_available=quantity_available-reservation.quantity,quantity_reserved=quantity_reserved-reservation.quantity where id=reservation.variant_id and quantity_reserved>=reservation.quantity and quantity_available>=reservation.quantity;
      insert into public.store_inventory_adjustments(variant_id,quantity_delta,resulting_quantity,reason,note,adjusted_by)
        select reservation.variant_id,-reservation.quantity,quantity_available,'order_fulfilled','Commande '||target.reference,auth.uid() from public.store_product_variants where id=reservation.variant_id;
      update public.store_inventory_reservations set status='consumed',consumed_at=now() where id=reservation.id;
    end loop;
  elsif p_to_status='cancelled' then
    perform public.release_store_order_reservations(target.id,not p_release_stock and target.status not in ('pending_confirmation','confirmed'));
  elsif p_to_status in ('delivery_failed','not_collected') then
    perform public.release_store_order_reservations(target.id,true);
  end if;
  update public.store_commerce_orders set status=p_to_status,confirmed_at=case when p_to_status='confirmed' then now() else confirmed_at end,delivered_at=case when p_to_status='delivered' then now() else delivered_at end,cancelled_at=case when p_to_status='cancelled' then now() else cancelled_at end,updated_at=now() where id=target.id;
  insert into public.store_order_status_history(order_id,from_status,to_status,reason,changed_by,actor_type) values(target.id,target.status,p_to_status,nullif(trim(p_reason),''),auth.uid(),'store_staff');
  event_name:=case p_to_status when 'confirmed' then 'order_confirmed' when 'out_for_delivery' then 'order_dispatched' when 'delivered' then 'order_delivered' when 'cancelled' then 'order_cancelled' end;
  if event_name is not null then insert into public.store_notification_outbox(order_id,event_type,status,payload) values(target.id,event_name,'disabled',jsonb_build_object('reference',target.reference)); end if;
  if p_to_status in ('out_for_delivery','delivered','delivery_failed','not_collected') then insert into public.store_delivery_events(order_id,event_type,note,created_by) values(target.id,case p_to_status when 'out_for_delivery' then 'dispatched' when 'delivery_failed' then 'failed' else p_to_status end,nullif(trim(p_reason),''),auth.uid()); end if;
  return jsonb_build_object('reference',target.reference,'status',p_to_status);
end; $$;

create or replace function public.record_store_cod_payment(p_order_id uuid,p_amount bigint,p_collected_at timestamptz,p_collection_method text,p_internal_reference text default null,p_variance_reason text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare target public.store_commerce_orders%rowtype; payment_id uuid;
begin
  if not public.is_store_staff(array['store_admin','order_manager']) then raise exception 'PAYMENT_STAFF_REQUIRED'; end if;
  select * into target from public.store_commerce_orders where id=p_order_id for update; if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if target.status<>'delivered' then raise exception 'ORDER_NOT_DELIVERED'; end if;
  if exists(select 1 from public.store_order_payments where order_id=target.id) then raise exception 'PAYMENT_ALREADY_RECORDED'; end if;
  if p_amount<0 or p_collection_method not in ('cash','mobile_money','bank_transfer','other') then raise exception 'INVALID_PAYMENT'; end if;
  if p_amount<>target.total_amount and nullif(trim(p_variance_reason),'') is null then raise exception 'PAYMENT_VARIANCE_REASON_REQUIRED'; end if;
  insert into public.store_order_payments(order_id,amount_collected,collected_at,collection_method,confirmed_by,internal_reference,variance_reason)
  values(target.id,p_amount,p_collected_at,p_collection_method,auth.uid(),nullif(trim(p_internal_reference),''),nullif(trim(p_variance_reason),'')) returning id into payment_id;
  update public.store_commerce_orders set payment_status=case when p_amount=total_amount then 'paid' else 'partial' end,updated_at=now() where id=target.id;
  return jsonb_build_object('paymentId',payment_id,'paymentStatus',case when p_amount=target.total_amount then 'paid' else 'partial' end);
end; $$;

do $$ declare table_name text; begin
  foreach table_name in array array['store_delivery_methods','store_delivery_zones','store_pickup_points','store_customer_addresses','store_commerce_orders'] loop
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_store_catalog_updated_at()',table_name,table_name);
  end loop;
end $$;

alter table public.store_delivery_methods enable row level security;
alter table public.store_delivery_zones enable row level security;
alter table public.store_pickup_points enable row level security;
alter table public.store_customer_addresses enable row level security;
alter table public.store_commerce_orders enable row level security;
alter table public.store_commerce_order_items enable row level security;
alter table public.store_inventory_reservations enable row level security;
alter table public.store_order_status_history enable row level security;
alter table public.store_order_payments enable row level security;
alter table public.store_delivery_events enable row level security;
alter table public.store_notification_outbox enable row level security;

revoke all on public.store_delivery_methods,public.store_delivery_zones,public.store_pickup_points,public.store_customer_addresses,public.store_commerce_orders,public.store_commerce_order_items,public.store_inventory_reservations,public.store_order_status_history,public.store_order_payments,public.store_delivery_events,public.store_notification_outbox from public,anon,authenticated;
grant select,insert,update,delete on public.store_delivery_methods,public.store_delivery_zones,public.store_pickup_points to authenticated;
grant select,insert,update,delete on public.store_customer_addresses to authenticated;
grant select on public.store_commerce_orders,public.store_commerce_order_items,public.store_order_status_history,public.store_order_payments,public.store_delivery_events to authenticated;
grant select on public.store_inventory_reservations to authenticated;
grant all on public.store_delivery_methods,public.store_delivery_zones,public.store_pickup_points,public.store_customer_addresses,public.store_commerce_orders,public.store_commerce_order_items,public.store_inventory_reservations,public.store_order_status_history,public.store_order_payments,public.store_delivery_events,public.store_notification_outbox to service_role;
grant usage,select on sequence public.store_order_status_history_id_seq,public.store_delivery_events_id_seq,public.store_notification_outbox_id_seq to service_role;

create policy store_delivery_methods_customer_read on public.store_delivery_methods for select to authenticated using (is_active or public.is_store_staff(array['store_admin','order_manager']));
create policy store_delivery_zones_customer_read on public.store_delivery_zones for select to authenticated using (is_active or public.is_store_staff(array['store_admin','order_manager']));
create policy store_pickup_points_customer_read on public.store_pickup_points for select to authenticated using (is_active or public.is_store_staff(array['store_admin','order_manager']));
create policy store_delivery_configuration_manage on public.store_delivery_methods for all to authenticated using (public.is_store_staff(array['store_admin','order_manager'])) with check (public.is_store_staff(array['store_admin','order_manager']));
create policy store_delivery_zones_manage on public.store_delivery_zones for all to authenticated using (public.is_store_staff(array['store_admin','order_manager'])) with check (public.is_store_staff(array['store_admin','order_manager']));
create policy store_pickup_points_manage on public.store_pickup_points for all to authenticated using (public.is_store_staff(array['store_admin','order_manager'])) with check (public.is_store_staff(array['store_admin','order_manager']));
create policy store_addresses_owner on public.store_customer_addresses for all to authenticated using (customer_id=auth.uid()) with check (customer_id=auth.uid());
create policy store_addresses_staff_read on public.store_customer_addresses for select to authenticated using (public.is_store_staff(array['store_admin','order_manager']));
create policy store_commerce_orders_owner_read on public.store_commerce_orders for select to authenticated using (customer_id=auth.uid());
create policy store_commerce_orders_staff_read on public.store_commerce_orders for select to authenticated using (public.is_store_staff(array['store_admin','order_manager']));
create policy store_commerce_order_items_owner_read on public.store_commerce_order_items for select to authenticated using (exists(select 1 from public.store_commerce_orders o where o.id=order_id and o.customer_id=auth.uid()));
create policy store_commerce_order_items_staff_read on public.store_commerce_order_items for select to authenticated using (public.is_store_staff(array['store_admin','order_manager']));
create policy store_order_history_owner_read on public.store_order_status_history for select to authenticated using (exists(select 1 from public.store_commerce_orders o where o.id=order_id and o.customer_id=auth.uid()));
create policy store_order_history_staff_read on public.store_order_status_history for select to authenticated using (public.is_store_staff(array['store_admin','order_manager']));
create policy store_order_payments_owner_read on public.store_order_payments for select to authenticated using (exists(select 1 from public.store_commerce_orders o where o.id=order_id and o.customer_id=auth.uid()));
create policy store_order_payments_staff_read on public.store_order_payments for select to authenticated using (public.is_store_staff(array['store_admin','order_manager']));
create policy store_reservations_staff_read on public.store_inventory_reservations for select to authenticated using (public.is_store_staff(array['store_admin','order_manager','inventory_manager']));
create policy store_delivery_events_owner_read on public.store_delivery_events for select to authenticated using (exists(select 1 from public.store_commerce_orders o where o.id=order_id and o.customer_id=auth.uid()));
create policy store_delivery_events_staff_read on public.store_delivery_events for select to authenticated using (public.is_store_staff(array['store_admin','order_manager']));

revoke all on function public.quote_store_checkout(jsonb,text,uuid,uuid,uuid),public.create_store_order(jsonb,text,uuid,uuid,uuid,uuid,bigint,bigint,text),public.cancel_store_order(text,text),public.transition_store_order(uuid,text,text,boolean),public.record_store_cod_payment(uuid,bigint,timestamptz,text,text,text),public.release_store_order_reservations(uuid,boolean),public.resolve_store_reservation_review(uuid,text,text) from public,anon;
grant execute on function public.quote_store_checkout(jsonb,text,uuid,uuid,uuid),public.create_store_order(jsonb,text,uuid,uuid,uuid,uuid,bigint,bigint,text),public.cancel_store_order(text,text) to authenticated;
grant execute on function public.transition_store_order(uuid,text,text,boolean),public.record_store_cod_payment(uuid,bigint,timestamptz,text,text,text) to authenticated;
grant execute on function public.resolve_store_reservation_review(uuid,text,text) to authenticated;
revoke execute on function public.release_store_order_reservations(uuid,boolean) from authenticated;

