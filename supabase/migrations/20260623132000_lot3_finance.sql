-- Lot 3 — Finance (modèle complet, additif et idempotent).
-- Conserve public.student_payments (legacy/démo). Le nouveau modèle normalisé
-- vit à côté: barèmes -> échéancier -> frais par élève -> paiements -> reçus.

-- Barème de frais (par niveau et/ou par classe).
create table if not exists public.fee_structures (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  label text not null,
  level text,
  class_id uuid references public.classes(id) on delete set null,
  academic_year text,
  total_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_fee_structures_school on public.fee_structures(school_id);

-- Échéancier rattaché à un barème.
create table if not exists public.fee_installments (
  id uuid primary key default gen_random_uuid(),
  fee_structure_id uuid not null references public.fee_structures(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  label text not null,
  due_date date not null,
  amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_fee_installments_structure on public.fee_installments(fee_structure_id);
create index if not exists idx_fee_installments_school on public.fee_installments(school_id);

-- Frais affectés à un élève (montant dû).
create table if not exists public.student_fees (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  fee_structure_id uuid references public.fee_structures(id) on delete set null,
  amount_due numeric(12,2) not null default 0,
  academic_year text,
  created_at timestamptz not null default now()
);

create index if not exists idx_student_fees_school on public.student_fees(school_id);
create index if not exists idx_student_fees_student on public.student_fees(student_id);

-- Paiements réels (encaissements). method conçu pour Mobile Money / carte / virement / espèces.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  student_fee_id uuid references public.student_fees(id) on delete set null,
  installment_id uuid references public.fee_installments(id) on delete set null,
  amount numeric(12,2) not null,
  method text not null default 'cash' check (method in ('mobile_money', 'card', 'transfer', 'cash')),
  status text not null default 'paid' check (status in ('paid', 'partial', 'pending', 'late')),
  receipt_no text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_school on public.payments(school_id);
create index if not exists idx_payments_student on public.payments(student_id);
create unique index if not exists uq_payments_receipt_no on public.payments(receipt_no) where receipt_no is not null;

alter table public.fee_structures enable row level security;
alter table public.fee_installments enable row level security;
alter table public.student_fees enable row level security;
alter table public.payments enable row level security;
