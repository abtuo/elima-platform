alter table public.identity_links
  add column if not exists external_school_name text,
  add column if not exists external_school_logo_url text;
