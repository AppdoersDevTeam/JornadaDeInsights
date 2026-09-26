-- Purchase entitlements from Stripe checkout.session.completed.
-- App dual-paths to Stripe sessions.list if this table is missing.

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  customer_email text not null,
  customer_name text,
  user_id uuid,
  ebook_id uuid,
  ebook_title text,
  amount_cents integer,
  currency text default 'brl',
  created_at timestamptz not null default now(),
  unique (session_id, ebook_id)
);

create index if not exists purchases_customer_email_idx
  on public.purchases (lower(customer_email));

create index if not exists purchases_ebook_id_idx
  on public.purchases (ebook_id);

alter table public.purchases enable row level security;
