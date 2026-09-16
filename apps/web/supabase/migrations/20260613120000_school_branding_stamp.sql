-- School branding: stamp (tampon) used on generated report PDFs.
-- logo_url already added by 20260215180000_seed_elima_extensions.sql.
-- Idempotent: safe to re-run.

alter table public.schools add column if not exists stamp_url text;
