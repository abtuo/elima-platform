-- Elima Store — MVP packs scolaires par classe.
-- Additif et idempotent: produits -> listes de fournitures -> packs -> commandes.

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  description text,
  category text,
  price numeric(12,2) not null default 0 check (price >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supply_lists (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  academic_year text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, class_id, academic_year, title)
);

create table if not exists public.supply_list_items (
  id uuid primary key default gen_random_uuid(),
  supply_list_id uuid not null references public.supply_lists(id) on delete cascade,
  name text not null,
  quantity integer not null default 1 check (quantity > 0),
  notes text,
  recommended_product_id uuid references public.store_products(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_packs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  supply_list_id uuid references public.supply_lists(id) on delete set null,
  title text not null,
  description text,
  price numeric(12,2) not null default 0 check (price >= 0),
  type text not null default 'essential' check (type in ('essential', 'recommended', 'premium')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_pack_items (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.store_packs(id) on delete cascade,
  product_id uuid references public.store_products(id) on delete set null,
  name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  parent_id uuid not null references public.parents(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  pack_id uuid not null references public.store_packs(id) on delete restrict,
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  order_status text not null default 'pending' check (
    order_status in ('pending', 'confirmed', 'preparing', 'available_for_pickup', 'picked_up', 'cancelled')
  ),
  pickup_location text not null default 'Retrait à l''école',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id uuid references public.store_products(id) on delete set null,
  name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  total_price numeric(12,2) not null default 0 check (total_price >= 0)
);

create index if not exists idx_store_products_school_active on public.store_products(school_id, is_active);
create index if not exists idx_supply_lists_school_class on public.supply_lists(school_id, class_id);
create index if not exists idx_supply_list_items_list on public.supply_list_items(supply_list_id);
create index if not exists idx_store_packs_school_class_status on public.store_packs(school_id, class_id, status);
create index if not exists idx_store_pack_items_pack on public.store_pack_items(pack_id);
create index if not exists idx_store_orders_school_status on public.store_orders(school_id, order_status);
create index if not exists idx_store_orders_parent on public.store_orders(parent_id);
create index if not exists idx_store_orders_student on public.store_orders(student_id);
create index if not exists idx_store_order_items_order on public.store_order_items(order_id);

create or replace function public.set_store_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_store_products_updated_at on public.store_products;
create trigger trg_store_products_updated_at
before update on public.store_products
for each row execute function public.set_store_updated_at();

drop trigger if exists trg_supply_lists_updated_at on public.supply_lists;
create trigger trg_supply_lists_updated_at
before update on public.supply_lists
for each row execute function public.set_store_updated_at();

drop trigger if exists trg_supply_list_items_updated_at on public.supply_list_items;
create trigger trg_supply_list_items_updated_at
before update on public.supply_list_items
for each row execute function public.set_store_updated_at();

drop trigger if exists trg_store_packs_updated_at on public.store_packs;
create trigger trg_store_packs_updated_at
before update on public.store_packs
for each row execute function public.set_store_updated_at();

drop trigger if exists trg_store_orders_updated_at on public.store_orders;
create trigger trg_store_orders_updated_at
before update on public.store_orders
for each row execute function public.set_store_updated_at();

alter table public.store_products enable row level security;
alter table public.supply_lists enable row level security;
alter table public.supply_list_items enable row level security;
alter table public.store_packs enable row level security;
alter table public.store_pack_items enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;

drop policy if exists "Store admins manage products" on public.store_products;
create policy "Store admins manage products"
on public.store_products for all to authenticated
using (
  school_id = public.current_user_school_id()
  and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN')
)
with check (
  school_id = public.current_user_school_id()
  and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN')
);

drop policy if exists "Parents read active store products" on public.store_products;
create policy "Parents read active store products"
on public.store_products for select to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.students s
    where s.school_id = store_products.school_id
      and public.user_can_access_student(s.id)
  )
);

drop policy if exists "Store admins manage supply lists" on public.supply_lists;
create policy "Store admins manage supply lists"
on public.supply_lists for all to authenticated
using (
  school_id = public.current_user_school_id()
  and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN')
)
with check (
  school_id = public.current_user_school_id()
  and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN')
);

drop policy if exists "Store admins manage supply list items" on public.supply_list_items;
create policy "Store admins manage supply list items"
on public.supply_list_items for all to authenticated
using (
  exists (
    select 1
    from public.supply_lists sl
    where sl.id = supply_list_items.supply_list_id
      and sl.school_id = public.current_user_school_id()
      and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN')
  )
)
with check (
  exists (
    select 1
    from public.supply_lists sl
    where sl.id = supply_list_items.supply_list_id
      and sl.school_id = public.current_user_school_id()
      and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN')
  )
);

drop policy if exists "Store admins manage packs" on public.store_packs;
create policy "Store admins manage packs"
on public.store_packs for all to authenticated
using (
  school_id = public.current_user_school_id()
  and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN')
)
with check (
  school_id = public.current_user_school_id()
  and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN')
);

drop policy if exists "Parents read published class packs" on public.store_packs;
create policy "Parents read published class packs"
on public.store_packs for select to authenticated
using (
  status = 'published'
  and public.user_can_access_class(class_id)
);

drop policy if exists "Store admins manage pack items" on public.store_pack_items;
create policy "Store admins manage pack items"
on public.store_pack_items for all to authenticated
using (
  exists (
    select 1
    from public.store_packs sp
    where sp.id = store_pack_items.pack_id
      and sp.school_id = public.current_user_school_id()
      and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN')
  )
)
with check (
  exists (
    select 1
    from public.store_packs sp
    where sp.id = store_pack_items.pack_id
      and sp.school_id = public.current_user_school_id()
      and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN')
  )
);

drop policy if exists "Parents read published pack items" on public.store_pack_items;
create policy "Parents read published pack items"
on public.store_pack_items for select to authenticated
using (
  exists (
    select 1
    from public.store_packs sp
    where sp.id = store_pack_items.pack_id
      and sp.status = 'published'
      and public.user_can_access_class(sp.class_id)
  )
);

drop policy if exists "Store admins manage orders" on public.store_orders;
create policy "Store admins manage orders"
on public.store_orders for all to authenticated
using (
  school_id = public.current_user_school_id()
  and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN')
)
with check (
  school_id = public.current_user_school_id()
  and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN')
);

drop policy if exists "Parents read own store orders" on public.store_orders;
create policy "Parents read own store orders"
on public.store_orders for select to authenticated
using (
  public.user_can_access_student(student_id)
  and exists (
    select 1
    from public.parents p
    where p.id = store_orders.parent_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "Parents create own store orders" on public.store_orders;
create policy "Parents create own store orders"
on public.store_orders for insert to authenticated
with check (
  public.user_can_access_student(student_id)
  and exists (
    select 1
    from public.parents p
    where p.id = store_orders.parent_id
      and p.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.store_packs sp
    where sp.id = store_orders.pack_id
      and sp.status = 'published'
      and sp.school_id = store_orders.school_id
      and sp.class_id = store_orders.class_id
  )
  and exists (
    select 1
    from public.students s
    where s.id = store_orders.student_id
      and s.school_id = store_orders.school_id
      and s.class_id = store_orders.class_id
  )
);

drop policy if exists "Store admins manage order items" on public.store_order_items;
create policy "Store admins manage order items"
on public.store_order_items for all to authenticated
using (
  exists (
    select 1
    from public.store_orders so
    where so.id = store_order_items.order_id
      and so.school_id = public.current_user_school_id()
      and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN')
  )
)
with check (
  exists (
    select 1
    from public.store_orders so
    where so.id = store_order_items.order_id
      and so.school_id = public.current_user_school_id()
      and public.current_user_role() in ('SUPER_ADMIN', 'SCHOOL_ADMIN')
  )
);

drop policy if exists "Parents read own store order items" on public.store_order_items;
create policy "Parents read own store order items"
on public.store_order_items for select to authenticated
using (
  exists (
    select 1
    from public.store_orders so
    where so.id = store_order_items.order_id
      and public.user_can_access_student(so.student_id)
      and exists (
        select 1
        from public.parents p
        where p.id = so.parent_id
          and p.user_id = auth.uid()
      )
  )
);
