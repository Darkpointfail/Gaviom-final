-- Run in Supabase SQL editor after auth setup (optional — webhook persists orders here)

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique not null,
  stripe_payment_intent text,
  customer_email text,
  amount_total integer,
  currency text default 'usd',
  mode text,
  metadata jsonb default '{}'::jsonb,
  status text,
  created_at timestamptz not null default now()
);

create index if not exists orders_email_idx on public.orders (customer_email);
create index if not exists orders_created_idx on public.orders (created_at desc);

alter table public.orders enable row level security;

-- No public read/write; only service role (webhook) inserts
create policy "orders_service_only"
  on public.orders
  for all
  using (false)
  with check (false);
