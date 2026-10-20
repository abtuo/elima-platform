-- Elima Store Phase 2C — imports traçables, données commerciales privées et qualité.

alter table public.store_catalog_products add column if not exists brand text;

create table if not exists public.store_variant_commercial_costs (
  variant_id uuid primary key references public.store_product_variants(id) on delete cascade,
  purchase_cost_amount bigint not null check (purchase_cost_amount >= 0),
  currency text not null default 'XOF' check (currency = 'XOF'),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_catalog_imports (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  filename text not null check (length(filename) between 1 and 255),
  file_format text not null check (file_format in ('csv','xlsx')),
  file_checksum text not null,
  conflict_strategy text not null check (conflict_strategy in ('skip','update')),
  status text not null default 'processing' check (status in ('processing','completed','completed_with_errors','failed')),
  total_rows integer not null default 0 check (total_rows >= 0 and total_rows <= 500),
  created_rows integer not null default 0 check (created_rows >= 0),
  updated_rows integer not null default 0 check (updated_rows >= 0),
  skipped_rows integer not null default 0 check (skipped_rows >= 0),
  error_rows integer not null default 0 check (error_rows >= 0),
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.store_catalog_import_rows (
  id bigint generated always as identity primary key,
  import_id uuid not null references public.store_catalog_imports(id) on delete cascade,
  row_number integer not null check (row_number > 0),
  sku text,
  action text not null check (action in ('create','update','skip','error')),
  product_id uuid references public.store_catalog_products(id) on delete set null,
  variant_id uuid references public.store_product_variants(id) on delete set null,
  errors jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(import_id, row_number)
);

create index if not exists idx_store_catalog_imports_created on public.store_catalog_imports(created_at desc);
create index if not exists idx_store_catalog_import_rows_import on public.store_catalog_import_rows(import_id, row_number);

alter table public.store_variant_commercial_costs enable row level security;
alter table public.store_catalog_imports enable row level security;
alter table public.store_catalog_import_rows enable row level security;

revoke all on public.store_variant_commercial_costs, public.store_catalog_imports, public.store_catalog_import_rows from public, anon, authenticated;
grant select, insert, update, delete on public.store_variant_commercial_costs to authenticated;
grant select, insert, update on public.store_catalog_imports to authenticated;
grant select, insert on public.store_catalog_import_rows to authenticated;
grant all on public.store_variant_commercial_costs, public.store_catalog_imports, public.store_catalog_import_rows to service_role;
grant usage, select on sequence public.store_catalog_import_rows_id_seq to authenticated, service_role;

create policy store_costs_catalog_staff on public.store_variant_commercial_costs for all to authenticated
  using (public.is_store_staff(array['store_admin','catalog_manager']))
  with check (public.is_store_staff(array['store_admin','catalog_manager']) and updated_by = auth.uid());
create policy store_imports_catalog_staff on public.store_catalog_imports for all to authenticated
  using (public.is_store_staff(array['store_admin','catalog_manager']))
  with check (public.is_store_staff(array['store_admin','catalog_manager']) and created_by = auth.uid());
create policy store_import_rows_catalog_staff on public.store_catalog_import_rows for all to authenticated
  using (public.is_store_staff(array['store_admin','catalog_manager']))
  with check (public.is_store_staff(array['store_admin','catalog_manager']) and exists (
    select 1 from public.store_catalog_imports imported where imported.id = import_id and imported.created_by = auth.uid()
  ));

create or replace function public.store_catalog_quality_report()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_store_staff(array['store_admin','catalog_manager']) then jsonb_build_object(
    'productsWithoutImage', coalesce((select jsonb_agg(jsonb_build_object('id', product.id, 'name', product.name)) from public.store_catalog_products product where not exists (select 1 from public.store_product_images image where image.product_id = product.id)), '[]'::jsonb),
    'productsWithoutPrice', coalesce((select jsonb_agg(jsonb_build_object('id', product.id, 'name', product.name)) from public.store_catalog_products product where not exists (select 1 from public.store_product_variants variant where variant.product_id = product.id and variant.price_amount >= 0)), '[]'::jsonb),
    'productsWithoutVariant', coalesce((select jsonb_agg(jsonb_build_object('id', product.id, 'name', product.name)) from public.store_catalog_products product where not exists (select 1 from public.store_product_variants variant where variant.product_id = product.id and variant.status = 'active')), '[]'::jsonb),
    'productsUnavailable', coalesce((select jsonb_agg(distinct jsonb_build_object('id', product.id, 'name', product.name)) from public.store_catalog_products product join public.store_product_variants variant on variant.product_id = product.id where variant.availability = 'unavailable'), '[]'::jsonb),
    'publishedInconsistencies', coalesce((select jsonb_agg(distinct jsonb_build_object('id', product.id, 'name', product.name)) from public.store_catalog_products product left join public.store_product_variants variant on variant.product_id = product.id and variant.status = 'active' where product.status = 'active' and (product.category_id is null or variant.id is null or variant.availability = 'unavailable' or not exists (select 1 from public.store_product_images image where image.product_id = product.id))), '[]'::jsonb),
    'kitsWithMissingItems', coalesce((select jsonb_agg(jsonb_build_object('id', kit.id, 'name', kit.name)) from public.store_catalog_kits kit where not exists (select 1 from public.store_kit_items item where item.kit_id = kit.id)), '[]'::jsonb),
    'duplicateSkus', coalesce((select jsonb_agg(jsonb_build_object('sku', sku, 'count', amount)) from (select sku, count(*) amount from public.store_product_variants group by sku having count(*) > 1) duplicates), '[]'::jsonb)
  ) else null end;
$$;
revoke all on function public.store_catalog_quality_report() from public, anon;
grant execute on function public.store_catalog_quality_report() to authenticated, service_role;
