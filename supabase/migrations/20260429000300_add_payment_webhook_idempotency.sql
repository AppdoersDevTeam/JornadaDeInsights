create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  session_id text,
  processed_at timestamptz not null default now()
);

create index if not exists idx_stripe_webhook_events_processed_at
  on public.stripe_webhook_events (processed_at desc);

create table if not exists public.purchase_email_events (
  session_id text primary key,
  customer_email text not null,
  status text not null default 'processing',
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_purchase_email_events_created_at
  on public.purchase_email_events (created_at desc);

alter table public.stripe_webhook_events enable row level security;
alter table public.purchase_email_events enable row level security;

revoke all on table public.stripe_webhook_events from anon, authenticated;
revoke all on table public.purchase_email_events from anon, authenticated;

grant select, insert, update on table public.stripe_webhook_events to service_role;
grant select, insert, update on table public.purchase_email_events to service_role;
