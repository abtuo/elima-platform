alter table public.store_orders
  add column if not exists invoice_no text,
  add column if not exists payment_method text;

create unique index if not exists idx_store_orders_invoice_no
  on public.store_orders (invoice_no)
  where invoice_no is not null;