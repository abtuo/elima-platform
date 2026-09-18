-- Lot 1 — Stabilisation & modèle de données (additif, idempotent).
-- Aucune suppression. Compatible avec le seed et les données de démonstration.

-- 1) Nouveau rôle COMPTABLE (accès aux espaces financiers).
--    ADD VALUE IF NOT EXISTS est supporté par PostgreSQL et ne casse pas les rôles existants.
alter type public.app_role add value if not exists 'COMPTABLE';

-- 2) Motif simple d'absence / retard (non disciplinaire).
alter table public.attendance add column if not exists reason text;

-- 3) Années scolaires (entité optionnelle).
--    classes.academic_year (texte) reste la source utilisée par le code existant.
--    Cette table sert de référentiel structurant pour les évolutions futures.
create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  label text not null,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (school_id, label)
);

create index if not exists idx_academic_years_school on public.academic_years(school_id);

alter table public.academic_years enable row level security;
