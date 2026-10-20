-- Elima Store Phase 2A — catalogue commercial persistant.
-- Additif : les anciennes tables store_products/store_packs liées aux écoles restent intactes.

create extension if not exists pgcrypto;

create table if not exists public.store_sellers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('store_admin', 'catalog_manager', 'inventory_manager')),
  status text not null default 'active' check (status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_seller_users (
  seller_id uuid not null references public.store_sellers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'manager', 'member')),
  status text not null default 'invited' check (status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  primary key (seller_id, user_id)
);

create table if not exists public.store_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.store_categories(id) on delete restrict,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);

create table if not exists public.store_grade_levels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  school_level text not null check (school_level in ('primaire', 'college', 'lycee')),
  sort_order integer not null unique,
  allows_series boolean not null default false,
  is_active boolean not null default true
);

create table if not exists public.store_academic_series (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.store_catalog_products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.store_sellers(id) on delete restrict,
  category_id uuid not null references public.store_categories(id) on delete restrict,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '',
  short_description text not null default '',
  product_type text not null default 'physical' check (product_type in ('physical', 'book', 'digital')),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  starting_price_amount bigint,
  has_active_promotion boolean not null default false,
  currency text not null default 'XOF' check (currency = 'XOF'),
  popularity_score integer not null default 0 check (popularity_score >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_document tsvector generated always as (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(description, ''))
  ) stored,
  check (starting_price_amount is null or starting_price_amount >= 0),
  check (status <> 'active' or published_at is not null)
);

create table if not exists public.store_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_catalog_products(id) on delete cascade,
  sku text not null unique check (length(trim(sku)) >= 3),
  name text not null,
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  price_amount bigint not null check (price_amount >= 0),
  promotional_price_amount bigint check (promotional_price_amount is null or (promotional_price_amount >= 0 and promotional_price_amount < price_amount)),
  currency text not null default 'XOF' check (currency = 'XOF'),
  quantity_available integer not null default 0 check (quantity_available >= 0),
  availability text not null default 'unavailable' check (availability in ('in_stock', 'available_on_order', 'out_of_stock', 'unavailable')),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  image_path text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (availability <> 'in_stock' or quantity_available > 0),
  check (availability <> 'out_of_stock' or quantity_available = 0)
);

create unique index if not exists idx_store_variants_one_default
  on public.store_product_variants(product_id) where is_default;

create table if not exists public.store_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_catalog_products(id) on delete cascade,
  variant_id uuid references public.store_product_variants(id) on delete cascade,
  storage_path text,
  external_url text,
  alt_text text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  check ((storage_path is not null)::integer + (external_url is not null)::integer = 1),
  unique (storage_path),
  unique (external_url)
);

create unique index if not exists idx_store_product_images_primary
  on public.store_product_images(product_id) where is_primary and variant_id is null;
create unique index if not exists idx_store_variant_images_primary
  on public.store_product_images(variant_id) where is_primary and variant_id is not null;

create table if not exists public.store_product_grades (
  product_id uuid not null references public.store_catalog_products(id) on delete cascade,
  grade_id uuid not null references public.store_grade_levels(id) on delete restrict,
  series_id uuid references public.store_academic_series(id) on delete restrict,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_store_product_grades_without_series
  on public.store_product_grades(product_id, grade_id) where series_id is null;
create unique index if not exists idx_store_product_grades_with_series
  on public.store_product_grades(product_id, grade_id, series_id) where series_id is not null;

create table if not exists public.store_inventory_adjustments (
  id bigint generated by default as identity primary key,
  variant_id uuid not null references public.store_product_variants(id) on delete restrict,
  quantity_delta integer not null check (quantity_delta <> 0),
  resulting_quantity integer not null check (resulting_quantity >= 0),
  reason text not null check (reason in ('initial', 'manual_correction', 'restock', 'damage', 'other')),
  note text,
  adjusted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.store_catalog_kits (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.store_sellers(id) on delete restrict,
  grade_id uuid not null references public.store_grade_levels(id) on delete restrict,
  series_id uuid references public.store_academic_series(id) on delete restrict,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  pricing_strategy text not null default 'sum_components' check (pricing_strategy in ('fixed', 'sum_components')),
  fixed_price_amount bigint,
  currency text not null default 'XOF' check (currency = 'XOF'),
  availability text not null default 'unavailable' check (availability in ('in_stock', 'available_on_order', 'out_of_stock', 'unavailable')),
  is_customizable boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((pricing_strategy = 'fixed' and fixed_price_amount is not null and fixed_price_amount >= 0) or (pricing_strategy = 'sum_components' and fixed_price_amount is null)),
  check (status <> 'active' or published_at is not null)
);

create table if not exists public.store_kit_items (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references public.store_catalog_kits(id) on delete cascade,
  product_id uuid not null references public.store_catalog_products(id) on delete restrict,
  variant_id uuid references public.store_product_variants(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.store_kit_images (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references public.store_catalog_kits(id) on delete cascade,
  storage_path text,
  external_url text,
  alt_text text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  check ((storage_path is not null)::integer + (external_url is not null)::integer = 1),
  unique (storage_path),
  unique (external_url)
);
create unique index if not exists idx_store_kit_images_primary
  on public.store_kit_images(kit_id) where is_primary;

create or replace function public.is_store_staff(required_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.store_staff staff
    where staff.user_id = auth.uid()
      and staff.status = 'active'
      and (required_roles is null or staff.role = any(required_roles))
  );
$$;
revoke all on function public.is_store_staff(text[]) from public;
grant execute on function public.is_store_staff(text[]) to anon, authenticated, service_role;

create or replace function public.adjust_store_inventory(
  p_variant_id uuid,
  p_quantity_delta integer,
  p_reason text,
  p_note text default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_quantity integer;
  next_quantity integer;
begin
  if not public.is_store_staff(array['store_admin','inventory_manager']) then
    raise exception 'Personnel inventaire Elima Store requis';
  end if;
  if p_quantity_delta = 0 or p_reason not in ('initial', 'manual_correction', 'restock', 'damage', 'other') then
    raise exception 'Ajustement de stock invalide';
  end if;
  select quantity_available into current_quantity
  from public.store_product_variants where id = p_variant_id for update;
  if not found then raise exception 'Variante introuvable'; end if;
  next_quantity := current_quantity + p_quantity_delta;
  if next_quantity < 0 then raise exception 'Le stock ne peut pas devenir négatif'; end if;
  update public.store_product_variants set
    quantity_available = next_quantity,
    availability = case
      when next_quantity = 0 and availability = 'in_stock' then 'out_of_stock'
      when next_quantity > 0 and availability = 'out_of_stock' then 'in_stock'
      else availability
    end
  where id = p_variant_id;
  insert into public.store_inventory_adjustments(variant_id, quantity_delta, resulting_quantity, reason, note, adjusted_by)
  values (p_variant_id, p_quantity_delta, next_quantity, p_reason, nullif(trim(p_note), ''), auth.uid());
  return next_quantity;
end;
$$;
revoke all on function public.adjust_store_inventory(uuid, integer, text, text) from public, anon;
grant execute on function public.adjust_store_inventory(uuid, integer, text, text) to authenticated, service_role;

create or replace function public.validate_store_product_grade()
returns trigger language plpgsql set search_path = public as $$
declare allows_series boolean;
begin
  select grade.allows_series into allows_series from public.store_grade_levels grade where grade.id = new.grade_id;
  if new.series_id is not null and not coalesce(allows_series, false) then
    raise exception 'Une série ne peut être associée qu’à un niveau compatible';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_store_product_grade on public.store_product_grades;
create trigger trg_validate_store_product_grade before insert or update on public.store_product_grades
for each row execute function public.validate_store_product_grade();

create or replace function public.validate_store_product_image()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.variant_id is not null and not exists (
    select 1 from public.store_product_variants variant
    where variant.id = new.variant_id and variant.product_id = new.product_id
  ) then
    raise exception 'La variante de l’image doit appartenir au produit';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_store_product_image on public.store_product_images;
create trigger trg_validate_store_product_image before insert or update on public.store_product_images
for each row execute function public.validate_store_product_image();

create or replace function public.validate_store_kit_classification()
returns trigger language plpgsql set search_path = public as $$
declare allows_series boolean;
begin
  select grade.allows_series into allows_series from public.store_grade_levels grade where grade.id = new.grade_id;
  if new.series_id is not null and not coalesce(allows_series, false) then
    raise exception 'Une série ne peut être associée qu’à un niveau compatible';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_store_kit_classification on public.store_catalog_kits;
create trigger trg_validate_store_kit_classification before insert or update on public.store_catalog_kits
for each row execute function public.validate_store_kit_classification();

create or replace function public.validate_store_kit_item()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.variant_id is not null and not exists (
    select 1 from public.store_product_variants variant
    where variant.id = new.variant_id and variant.product_id = new.product_id
  ) then
    raise exception 'La variante doit appartenir au produit du kit';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_store_kit_item on public.store_kit_items;
create trigger trg_validate_store_kit_item before insert or update on public.store_kit_items
for each row execute function public.validate_store_kit_item();

create or replace function public.refresh_store_product_starting_price()
returns trigger language plpgsql set search_path = public as $$
declare target_product_id uuid;
begin
  target_product_id := coalesce(new.product_id, old.product_id);
  update public.store_catalog_products product set
    starting_price_amount = (
      select min(coalesce(variant.promotional_price_amount, variant.price_amount))
      from public.store_product_variants variant
      where variant.product_id = target_product_id and variant.status = 'active'
    ),
    has_active_promotion = exists (
      select 1 from public.store_product_variants variant
      where variant.product_id = target_product_id and variant.status = 'active'
        and variant.promotional_price_amount is not null
    ),
    updated_at = now()
  where product.id = target_product_id;
  return null;
end;
$$;

drop trigger if exists trg_refresh_store_product_price on public.store_product_variants;
create trigger trg_refresh_store_product_price after insert or update or delete on public.store_product_variants
for each row execute function public.refresh_store_product_starting_price();

create or replace function public.set_store_catalog_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['store_sellers', 'store_staff', 'store_categories', 'store_catalog_products', 'store_product_variants', 'store_catalog_kits']
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_store_catalog_updated_at()', table_name, table_name);
  end loop;
end $$;

create index if not exists idx_store_categories_parent_sort on public.store_categories(parent_id, is_active, sort_order);
create index if not exists idx_store_products_public_sort on public.store_catalog_products(status, published_at desc);
create index if not exists idx_store_products_category_public on public.store_catalog_products(category_id, status, published_at desc);
create index if not exists idx_store_products_seller on public.store_catalog_products(seller_id, status);
create index if not exists idx_store_products_price on public.store_catalog_products(starting_price_amount) where status = 'active';
create index if not exists idx_store_products_promotions on public.store_catalog_products(published_at desc) where status = 'active' and has_active_promotion;
create index if not exists idx_store_products_popularity on public.store_catalog_products(popularity_score desc) where status = 'active';
create index if not exists idx_store_products_search on public.store_catalog_products using gin(search_document);
create index if not exists idx_store_variants_product_public on public.store_product_variants(product_id, status, availability);
create index if not exists idx_store_product_grades_grade on public.store_product_grades(grade_id, product_id);
create index if not exists idx_store_inventory_variant_created on public.store_inventory_adjustments(variant_id, created_at desc);
create index if not exists idx_store_kits_grade_public on public.store_catalog_kits(grade_id, status, published_at desc);
create index if not exists idx_store_kit_items_kit_sort on public.store_kit_items(kit_id, sort_order);
create unique index if not exists idx_store_kit_items_product_without_variant
  on public.store_kit_items(kit_id, product_id) where variant_id is null;
create unique index if not exists idx_store_kit_items_product_variant
  on public.store_kit_items(kit_id, product_id, variant_id) where variant_id is not null;

insert into public.store_sellers(name, slug, description, status)
values ('Elima Store', 'elima-store', 'Vendeur interne officiel de la boutique Elima.', 'active')
on conflict (slug) do update set name = excluded.name, description = excluded.description, status = excluded.status, updated_at = now();

insert into public.store_categories(name, slug, description, sort_order, is_active)
values ('Fournitures scolaires', 'fournitures-scolaires', 'Fournitures pour le primaire et le secondaire.', 10, true)
on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.store_categories(parent_id, name, slug, sort_order, is_active)
select parent.id, item.name, item.slug, item.sort_order, true
from public.store_categories parent
cross join (values
  ('Cahiers et papiers', 'cahiers-et-papiers', 10),
  ('Écriture', 'ecriture', 20),
  ('Géométrie', 'geometrie', 30),
  ('Calculatrices', 'calculatrices', 40),
  ('Dessin et arts', 'dessin-et-arts', 50),
  ('Sacs et accessoires', 'sacs-et-accessoires', 60),
  ('Livres et manuels', 'livres-et-manuels', 70),
  ('Annales et révisions', 'annales-et-revisions', 80)
) as item(name, slug, sort_order)
where parent.slug = 'fournitures-scolaires'
on conflict (slug) do update set name = excluded.name, parent_id = excluded.parent_id, sort_order = excluded.sort_order;

insert into public.store_grade_levels(slug, label, school_level, sort_order, allows_series)
values
  ('cp1','CP1','primaire',10,false), ('cp2','CP2','primaire',20,false),
  ('ce1','CE1','primaire',30,false), ('ce2','CE2','primaire',40,false),
  ('cm1','CM1','primaire',50,false), ('cm2','CM2','primaire',60,false),
  ('6e','6e','college',70,false), ('5e','5e','college',80,false),
  ('4e','4e','college',90,false), ('3e','3e','college',100,false),
  ('2nde','2nde','lycee',110,true), ('1re','1re','lycee',120,true),
  ('terminale','Terminale','lycee',130,true)
on conflict (slug) do update set label = excluded.label, school_level = excluded.school_level, sort_order = excluded.sort_order, allows_series = excluded.allows_series;

alter table public.store_sellers enable row level security;
alter table public.store_staff enable row level security;
alter table public.store_seller_users enable row level security;
alter table public.store_categories enable row level security;
alter table public.store_grade_levels enable row level security;
alter table public.store_academic_series enable row level security;
alter table public.store_catalog_products enable row level security;
alter table public.store_product_variants enable row level security;
alter table public.store_product_images enable row level security;
alter table public.store_product_grades enable row level security;
alter table public.store_inventory_adjustments enable row level security;
alter table public.store_catalog_kits enable row level security;
alter table public.store_kit_items enable row level security;
alter table public.store_kit_images enable row level security;

revoke all on public.store_sellers, public.store_staff, public.store_seller_users, public.store_categories,
  public.store_grade_levels, public.store_academic_series, public.store_catalog_products,
  public.store_product_variants, public.store_product_images, public.store_product_grades,
  public.store_inventory_adjustments, public.store_catalog_kits, public.store_kit_items,
  public.store_kit_images from public, anon, authenticated;
grant select on public.store_sellers, public.store_categories, public.store_grade_levels,
  public.store_academic_series, public.store_catalog_products, public.store_product_variants,
  public.store_product_images, public.store_product_grades, public.store_catalog_kits,
  public.store_kit_items, public.store_kit_images to anon, authenticated;
grant insert, update, delete on public.store_sellers, public.store_categories, public.store_grade_levels,
  public.store_academic_series, public.store_catalog_products, public.store_product_variants,
  public.store_product_images, public.store_product_grades, public.store_catalog_kits,
  public.store_kit_items, public.store_kit_images to authenticated;
grant select on public.store_inventory_adjustments to authenticated;
grant select on public.store_staff, public.store_seller_users to authenticated;
grant all on public.store_sellers, public.store_staff, public.store_seller_users, public.store_categories,
  public.store_grade_levels, public.store_academic_series, public.store_catalog_products,
  public.store_product_variants, public.store_product_images, public.store_product_grades,
  public.store_inventory_adjustments, public.store_catalog_kits, public.store_kit_items,
  public.store_kit_images to service_role;
grant usage, select on sequence public.store_inventory_adjustments_id_seq to service_role;

create policy store_sellers_public_read on public.store_sellers for select to anon, authenticated using (status = 'active');
create policy store_categories_public_read on public.store_categories for select to anon, authenticated using (is_active);
create policy store_grades_public_read on public.store_grade_levels for select to anon, authenticated using (is_active);
create policy store_series_public_read on public.store_academic_series for select to anon, authenticated using (is_active);
create policy store_products_public_read on public.store_catalog_products for select to anon, authenticated using (status = 'active' and published_at <= now());
create policy store_variants_public_read on public.store_product_variants for select to anon, authenticated using (
  status = 'active' and exists (select 1 from public.store_catalog_products product where product.id = product_id and product.status = 'active' and product.published_at <= now())
);
create policy store_product_images_public_read on public.store_product_images for select to anon, authenticated using (
  exists (select 1 from public.store_catalog_products product where product.id = product_id and product.status = 'active' and product.published_at <= now())
);
create policy store_product_grades_public_read on public.store_product_grades for select to anon, authenticated using (
  exists (select 1 from public.store_catalog_products product where product.id = product_id and product.status = 'active' and product.published_at <= now())
);
create policy store_kits_public_read on public.store_catalog_kits for select to anon, authenticated using (status = 'active' and published_at <= now());
create policy store_kit_items_public_read on public.store_kit_items for select to anon, authenticated using (
  exists (select 1 from public.store_catalog_kits kit where kit.id = kit_id and kit.status = 'active' and kit.published_at <= now())
);
create policy store_kit_images_public_read on public.store_kit_images for select to anon, authenticated using (
  exists (select 1 from public.store_catalog_kits kit where kit.id = kit_id and kit.status = 'active' and kit.published_at <= now())
);
create policy store_staff_read_self on public.store_staff for select to authenticated using (user_id = auth.uid());
create policy store_seller_users_read_self on public.store_seller_users for select to authenticated using (user_id = auth.uid() or public.is_store_staff(array['store_admin']));
create policy store_inventory_staff_read on public.store_inventory_adjustments for select to authenticated using (public.is_store_staff(null));

do $$
declare table_name text;
begin
  foreach table_name in array array['store_sellers','store_categories','store_grade_levels','store_academic_series','store_catalog_products','store_product_variants','store_product_images','store_product_grades','store_catalog_kits','store_kit_items','store_kit_images']
  loop
    execute format('create policy %I on public.%I for all to authenticated using (public.is_store_staff(array[''store_admin'',''catalog_manager''])) with check (public.is_store_staff(array[''store_admin'',''catalog_manager'']))', 'store_staff_manage_' || table_name, table_name);
  end loop;
end $$;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('store-product-media', 'store-product-media', false, 8388608, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy store_media_public_read on storage.objects for select to anon, authenticated using (
  bucket_id = 'store-product-media' and (
    exists (
      select 1 from public.store_product_images image
      join public.store_catalog_products product on product.id = image.product_id
      where image.storage_path = name and product.status = 'active' and product.published_at <= now()
    ) or exists (
      select 1 from public.store_kit_images image
      join public.store_catalog_kits kit on kit.id = image.kit_id
      where image.storage_path = name and kit.status = 'active' and kit.published_at <= now()
    )
  )
);
create policy store_media_staff_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'store-product-media' and public.is_store_staff(array['store_admin','catalog_manager'])
);
create policy store_media_staff_update on storage.objects for update to authenticated using (
  bucket_id = 'store-product-media' and public.is_store_staff(array['store_admin','catalog_manager'])
) with check (
  bucket_id = 'store-product-media' and public.is_store_staff(array['store_admin','catalog_manager'])
);
create policy store_media_staff_delete on storage.objects for delete to authenticated using (
  bucket_id = 'store-product-media' and public.is_store_staff(array['store_admin','catalog_manager'])
);
