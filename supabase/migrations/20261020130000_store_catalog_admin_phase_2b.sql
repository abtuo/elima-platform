-- Elima Store Phase 2B — garde-fous et opérations du back-office.

alter table public.store_product_variants
  add column if not exists low_stock_threshold integer not null default 5,
  add column if not exists promotion_starts_at timestamptz,
  add column if not exists promotion_ends_at timestamptz;

do $$ begin
  alter table public.store_product_variants add constraint store_variant_low_stock_threshold_check check (low_stock_threshold >= 0);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.store_product_variants add constraint store_variant_promotion_dates_check check (
    promotional_price_amount is not null or (promotion_starts_at is null and promotion_ends_at is null)
  );
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.store_product_variants add constraint store_variant_promotion_period_check check (
    promotion_starts_at is null or promotion_ends_at is null or promotion_ends_at > promotion_starts_at
  );
exception when duplicate_object then null; end $$;

create index if not exists idx_store_variants_low_stock
  on public.store_product_variants(quantity_available, low_stock_threshold)
  where status = 'active';
create index if not exists idx_store_variants_promotion_period
  on public.store_product_variants(promotion_starts_at, promotion_ends_at)
  where status = 'active' and promotional_price_amount is not null;

create or replace function public.validate_store_category_hierarchy()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.parent_id is null then return new; end if;
  if new.parent_id = new.id then raise exception 'Une catégorie ne peut pas être son propre parent'; end if;
  if exists (
    with recursive descendants as (
      select id from public.store_categories where parent_id = new.id
      union all
      select child.id from public.store_categories child join descendants parent on child.parent_id = parent.id
    ) select 1 from descendants where id = new.parent_id
  ) then raise exception 'La hiérarchie de catégories ne peut pas contenir de cycle'; end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_store_category_hierarchy on public.store_categories;
create trigger trg_validate_store_category_hierarchy before insert or update of parent_id on public.store_categories
for each row execute function public.validate_store_category_hierarchy();

create or replace function public.set_store_product_publication(p_product_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare product_record public.store_catalog_products%rowtype;
begin
  if not public.is_store_staff(array['store_admin','catalog_manager']) then
    raise exception 'Personnel catalogue Elima Store requis';
  end if;
  if p_status not in ('draft','active','archived') then raise exception 'Statut de publication invalide'; end if;
  select * into product_record from public.store_catalog_products where id = p_product_id for update;
  if not found then raise exception 'Produit introuvable'; end if;
  if p_status = 'active' then
    if length(trim(product_record.name)) < 2 or length(trim(product_record.slug)) < 2 then
      raise exception 'Nom et slug requis';
    end if;
    if not exists (select 1 from public.store_categories where id = product_record.category_id and is_active) then
      raise exception 'Une catégorie active est requise';
    end if;
    if not exists (
      select 1 from public.store_product_variants
      where product_id = p_product_id and status = 'active' and price_amount >= 0
    ) then raise exception 'Au moins une variante active avec un prix valide est requise'; end if;
  end if;
  update public.store_catalog_products set
    status = p_status,
    published_at = case when p_status = 'active' then coalesce(published_at, now()) else null end
  where id = p_product_id;
end;
$$;
revoke all on function public.set_store_product_publication(uuid, text) from public, anon;
grant execute on function public.set_store_product_publication(uuid, text) to authenticated, service_role;

create policy store_inventory_products_read on public.store_catalog_products for select to authenticated
  using (public.is_store_staff(array['inventory_manager']));
create policy store_inventory_variants_read on public.store_product_variants for select to authenticated
  using (public.is_store_staff(array['inventory_manager']));
create policy store_inventory_sellers_read on public.store_sellers for select to authenticated
  using (public.is_store_staff(array['inventory_manager']));
create policy store_inventory_categories_read on public.store_categories for select to authenticated
  using (public.is_store_staff(array['inventory_manager']));

create policy store_media_staff_read on storage.objects for select to authenticated using (
  bucket_id = 'store-product-media' and public.is_store_staff(array['store_admin','catalog_manager'])
);

create or replace function public.store_admin_dashboard()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_store_staff(null) then jsonb_build_object(
    'totalProducts', (select count(*) from public.store_catalog_products),
    'publishedProducts', (select count(*) from public.store_catalog_products where status = 'active'),
    'draftProducts', (select count(*) from public.store_catalog_products where status = 'draft'),
    'archivedProducts', (select count(*) from public.store_catalog_products where status = 'archived'),
    'productsWithoutImage', (select count(*) from public.store_catalog_products product where not exists (select 1 from public.store_product_images image where image.product_id = product.id)),
    'outOfStockVariants', (select count(*) from public.store_product_variants where status = 'active' and availability = 'out_of_stock'),
    'lowStockVariants', (select count(*) from public.store_product_variants where status = 'active' and quantity_available > 0 and quantity_available <= low_stock_threshold),
    'publishedKits', (select count(*) from public.store_catalog_kits where status = 'active'),
    'activeCategories', (select count(*) from public.store_categories where is_active)
  ) else null end;
$$;
revoke all on function public.store_admin_dashboard() from public, anon;
grant execute on function public.store_admin_dashboard() to authenticated, service_role;

create or replace function public.store_admin_products(
  p_search text default null, p_status text default null, p_category_id uuid default null,
  p_sort text default 'updated_desc', p_offset integer default 0, p_limit integer default 20
) returns jsonb language sql stable security definer set search_path = public as $$
  with filtered as (
    select product.* from public.store_catalog_products product
    where public.is_store_staff(array['store_admin','catalog_manager'])
      and (p_status is null or product.status = p_status)
      and (p_category_id is null or product.category_id = p_category_id)
      and (p_search is null or product.name ilike '%' || p_search || '%' or exists (
        select 1 from public.store_product_variants variant where variant.product_id = product.id and variant.sku ilike '%' || p_search || '%'
      ))
  ), page as (
    select filtered.* from filtered order by
      case when p_sort = 'name_asc' then filtered.name end asc,
      case when p_sort = 'created_desc' then filtered.created_at end desc,
      case when p_sort = 'updated_desc' then filtered.updated_at end desc,
      filtered.updated_at desc offset greatest(p_offset, 0) limit least(greatest(p_limit, 1), 50)
  )
  select jsonb_build_object('total', (select count(*) from filtered), 'items', coalesce(jsonb_agg(jsonb_build_object(
    'id', page.id, 'name', page.name, 'slug', page.slug, 'status', page.status, 'updatedAt', page.updated_at,
    'category', category.name, 'imagePath', image.storage_path, 'imageUrl', image.external_url,
    'sku', variant.sku, 'price', variant.price_amount, 'promotion', variant.promotional_price_amount,
    'stock', variant.quantity_available, 'availability', variant.availability
  )), '[]'::jsonb))
  from page join public.store_categories category on category.id = page.category_id
  left join lateral (select * from public.store_product_variants where product_id = page.id order by is_default desc, created_at limit 1) variant on true
  left join lateral (select * from public.store_product_images where product_id = page.id order by is_primary desc, sort_order limit 1) image on true;
$$;
revoke all on function public.store_admin_products(text,text,uuid,text,integer,integer) from public, anon;
grant execute on function public.store_admin_products(text,text,uuid,text,integer,integer) to authenticated, service_role;
