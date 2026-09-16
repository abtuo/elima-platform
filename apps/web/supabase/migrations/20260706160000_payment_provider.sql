alter table public.payments add column if not exists payment_provider text;
alter table public.store_orders add column if not exists payment_provider text;
