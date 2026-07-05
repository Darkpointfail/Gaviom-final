-- Run after supabase-auth-setup.sql, supabase-orders-setup.sql, supabase-account-setup.sql

-- ── Orders: link to user ──
alter table public.orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists orders_user_id_idx on public.orders (user_id);

-- ── Cart (synced per account) ──
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prize_id text not null,
  qty integer not null check (qty > 0 and qty <= 100),
  line_total numeric(10, 2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, prize_id)
);

create index if not exists cart_items_user_idx on public.cart_items (user_id);

alter table public.cart_items enable row level security;

drop policy if exists "Users manage own cart" on public.cart_items;
create policy "Users manage own cart"
  on public.cart_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Promo codes redeemed / saved ──
create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  status text not null default 'saved' check (status in ('saved', 'applied', 'expired')),
  created_at timestamptz not null default now(),
  unique (user_id, code)
);

create index if not exists promo_redemptions_user_idx on public.promo_redemptions (user_id);

alter table public.promo_redemptions enable row level security;

drop policy if exists "Users manage own promos" on public.promo_redemptions;
create policy "Users manage own promos"
  on public.promo_redemptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Gaviom+ membership ──
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_email text not null,
  plan text not null default 'monthly',
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  stripe_subscription_id text unique,
  stripe_customer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memberships_user_idx on public.memberships (user_id);
create index if not exists memberships_email_idx on public.memberships (lower(customer_email));

alter table public.memberships enable row level security;

drop policy if exists "Users read own membership" on public.memberships;
create policy "Users read own membership"
  on public.memberships for select
  using (
    auth.uid() = user_id
    or lower(customer_email) = lower(auth.jwt() ->> 'email')
  );

-- ── Sweepstakes entries / tickets ──
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_email text not null,
  prize_id text not null,
  quantity integer not null check (quantity > 0),
  source text not null default 'purchase' check (source in ('purchase', 'membership', 'amoe', 'promo', 'free')),
  order_id uuid references public.orders(id) on delete set null,
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'void')),
  draw_id text default 'founding-2026-09',
  created_at timestamptz not null default now()
);

create index if not exists entries_user_idx on public.entries (user_id);
create index if not exists entries_email_idx on public.entries (lower(customer_email));
create index if not exists entries_created_idx on public.entries (created_at desc);

alter table public.entries enable row level security;

drop policy if exists "Users read own entries" on public.entries;
create policy "Users read own entries"
  on public.entries for select
  using (
    auth.uid() = user_id
    or lower(customer_email) = lower(auth.jwt() ->> 'email')
  );

-- Webhook inserts via service role (bypasses RLS)

create unique index if not exists orders_payment_intent_uidx
  on public.orders (stripe_payment_intent)
  where stripe_payment_intent is not null;

-- ── Ensure orders.user_id readable ──
drop policy if exists "Users read own orders by email" on public.orders;
create policy "Users read own orders by email"
  on public.orders for select
  using (
    auth.uid() = user_id
    or lower(customer_email) = lower(auth.jwt() ->> 'email')
  );
