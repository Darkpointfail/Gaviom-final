-- ═══════════════════════════════════════════════════════════════════════════
-- GAVIOM — Supabase full setup (run once in SQL Editor)
-- Dashboard → SQL → New query → paste → Run
--
-- Order: run this entire file, OR run each file separately in the same order:
--   1) supabase-auth-setup.sql
--   2) supabase-orders-setup.sql
--   3) supabase-account-setup.sql
--   4) supabase-data-setup.sql
--
-- ⚠️  Fresh projects: uses public.profiles (single source of truth).
--     Existing projects with public.users: run supabase-profiles-migration.sql first.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. PROFILES (linked to auth.users) ──
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  date_of_birth date,
  state text,
  marketing_opt_in boolean default false,
  avatar_url text,
  promo_code text,
  stripe_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists profiles_email_idx on public.profiles (lower(email));

alter table public.profiles enable row level security;

drop policy if exists "Profiles: owner read" on public.profiles;
create policy "Profiles: owner read"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Profiles: owner update" on public.profiles;
create policy "Profiles: owner update"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "Profiles: owner insert" on public.profiles;
create policy "Profiles: owner insert"
  on public.profiles for insert with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, first_name, last_name, date_of_birth, state, marketing_opt_in)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    nullif(new.raw_user_meta_data->>'date_of_birth', '')::date,
    new.raw_user_meta_data->>'state',
    coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, false)
  )
  on conflict (id) do update set
    email = excluded.email,
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    date_of_birth = coalesce(excluded.date_of_birth, public.profiles.date_of_birth),
    state = coalesce(excluded.state, public.profiles.state),
    marketing_opt_in = coalesce(excluded.marketing_opt_in, public.profiles.marketing_opt_in),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 2. ORDERS (Stripe webhook) ──
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique,
  stripe_payment_intent text,
  customer_email text,
  user_id uuid references auth.users(id) on delete set null,
  amount_total integer,
  currency text default 'usd',
  mode text,
  metadata jsonb default '{}'::jsonb,
  status text,
  created_at timestamptz not null default now()
);

alter table public.orders alter column stripe_session_id drop not null;

create index if not exists orders_email_idx on public.orders (customer_email);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_user_id_idx on public.orders (user_id);

create unique index if not exists orders_payment_intent_uidx
  on public.orders (stripe_payment_intent)
  where stripe_payment_intent is not null;

alter table public.orders enable row level security;

drop policy if exists "orders_service_only" on public.orders;
drop policy if exists "Users read own orders by email" on public.orders;
create policy "Users read own orders by email"
  on public.orders for select
  using (
    auth.uid() = user_id
    or lower(customer_email) = lower(auth.jwt() ->> 'email')
  );

-- ── 3. AVATAR STORAGE ──
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar public read" on storage.objects;
create policy "Avatar public read"
  on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "Avatar owner upload" on storage.objects;
create policy "Avatar owner upload"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Avatar owner update" on storage.objects;
create policy "Avatar owner update"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Avatar owner delete" on storage.objects;
create policy "Avatar owner delete"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- ── 4. CART (synced per account) ──
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
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── 5. PROMO CODES ──
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
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── 6. GAVIOM+ MEMBERSHIP ──
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_email text not null,
  plan text not null default 'monthly',
  status text not null default 'active'
    check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
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

-- ── 7. SWEEPSTAKES ENTRIES / TICKETS ──
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_email text not null,
  prize_id text not null,
  quantity integer not null check (quantity > 0),
  source text not null default 'purchase'
    check (source in ('purchase', 'membership', 'amoe', 'promo', 'free')),
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

-- Done. Webhook inserts (orders, entries, memberships) use SUPABASE_SERVICE_ROLE_KEY on Vercel.
