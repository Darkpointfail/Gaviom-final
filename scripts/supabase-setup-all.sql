-- ═══════════════════════════════════════════════════════════════════════════
-- GAVIOM — Setup Supabase complet (SQL Editor)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- COMMENT UTILISER (repartir propre dans SQL Editor)
-- ─────────────────────────────────────────────────────
-- Option A — 1 seule query (le plus simple)
--   • New query → nom : "Gaviom — 00 setup complet"
--   • Colle TOUT ce fichier → Run
--
-- Option B — 5 queries nommées (recommandé pour maintenance)
--   Crée 5 queries vides, copie chaque bloc entre les marqueurs ═══ :
--
--   01 gaviom-core          →  SECTION 1
--   02 gaviom-creators      →  SECTION 2
--   03 gaviom-creator-sw    →  SECTION 3
--   04 gaviom-otp-codes     →  SECTION 4
--   05 gaviom-amoe-indexes  →  SECTION 5 (quand AMOE en ligne est codé)
--   99 gaviom-verify        →  SECTION 6 (vérification, lecture seule)
--
-- Ordre d'exécution : 01 → 02 → 03 → 04 → 05 (05 optionnel pour l'instant)
-- Idempotent : safe de relancer (IF NOT EXISTS, DROP IF EXISTS).
--
-- ⚠️  Projet legacy avec table public.users (pas profiles) :
--     lance d'abord scripts/supabase-profiles-migration.sql
-- ═══════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 1 — gaviom-core                                                  ║
-- ║  profiles · orders · cart · promo · memberships · entries · avatars      ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

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

-- ── 4. CART ──
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

-- ── 7. ENTRIES / TICKETS ──
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
create index if not exists entries_prize_id_idx on public.entries (prize_id, created_at desc);

alter table public.entries enable row level security;

drop policy if exists "Users read own entries" on public.entries;
create policy "Users read own entries"
  on public.entries for select
  using (
    auth.uid() = user_id
    or lower(customer_email) = lower(auth.jwt() ->> 'email')
  );


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 2 — gaviom-creators                                              ║
-- ║  creator_applications · creator_status sur profiles                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

alter table public.profiles
  add column if not exists creator_status text not null default 'none',
  add column if not exists creator_slug text,
  add column if not exists creator_approved_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_creator_status_check;

alter table public.profiles
  add constraint profiles_creator_status_check
  check (creator_status in ('none', 'pending', 'approved', 'rejected'));

create unique index if not exists profiles_creator_slug_unique_idx
  on public.profiles (lower(creator_slug))
  where creator_slug is not null;

create table if not exists public.creator_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  country text not null,
  social_url text not null,
  creator_name text not null,
  category text not null,
  audience_size text not null,
  platforms text not null,
  engagement text not null,
  prize text not null,
  prize_value_usd numeric(12, 2) not null,
  description text not null,
  expected_participants text,
  desired_launch_date date,
  status text not null default 'pending',
  source text,
  admin_notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  review_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_applications_status_check
    check (status in ('pending', 'under_review', 'approved', 'rejected')),
  constraint creator_applications_prize_value_check
    check (prize_value_usd >= 100)
);

create index if not exists creator_applications_user_id_created_idx
  on public.creator_applications (user_id, created_at desc);

create index if not exists creator_applications_status_created_idx
  on public.creator_applications (status, created_at desc);

create index if not exists creator_applications_email_idx
  on public.creator_applications (lower(email));

create unique index if not exists creator_applications_review_token_idx
  on public.creator_applications (review_token)
  where review_token is not null;

create unique index if not exists creator_applications_one_open_per_user_idx
  on public.creator_applications (user_id)
  where status in ('pending', 'under_review');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists creator_applications_set_updated_at on public.creator_applications;
create trigger creator_applications_set_updated_at
  before update on public.creator_applications
  for each row execute function public.set_updated_at();

alter table public.creator_applications enable row level security;

drop policy if exists "Creator apps: owner read" on public.creator_applications;
create policy "Creator apps: owner read"
  on public.creator_applications for select
  using (auth.uid() = user_id);

drop policy if exists "Creator apps: owner insert pending" on public.creator_applications;
create policy "Creator apps: owner insert pending"
  on public.creator_applications for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
  );

grant select, insert on public.creator_applications to authenticated;
grant all on public.creator_applications to service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 3 — gaviom-creator-sw                                            ║
-- ║  creator_sweepstakes · storage creator-listings                           ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

create table if not exists public.creator_sweepstakes (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.creator_applications(id) on delete set null,
  slug text not null,
  prize_id text not null,
  title text not null,
  public_title text,
  description text,
  cover_image_url text,
  gallery jsonb not null default '[]'::jsonb,
  prize_name text not null,
  prize_value_usd numeric(12, 2) not null default 0,
  ticket_price_usd numeric(10, 2) not null default 10,
  entry_cap integer not null default 1000,
  fee_pct numeric(5, 4) not null default 0.15,
  status text not null default 'review'
    check (status in ('draft', 'review', 'live', 'ended', 'cancelled')),
  emoji text not null default '🎁',
  draw_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_sweepstakes_prize_value_check check (prize_value_usd >= 0),
  constraint creator_sweepstakes_ticket_price_check check (ticket_price_usd > 0),
  constraint creator_sweepstakes_entry_cap_check check (entry_cap > 0),
  constraint creator_sweepstakes_fee_pct_check check (fee_pct >= 0 and fee_pct < 1)
);

create unique index if not exists creator_sweepstakes_prize_id_uidx
  on public.creator_sweepstakes (prize_id);

create unique index if not exists creator_sweepstakes_creator_slug_uidx
  on public.creator_sweepstakes (creator_id, lower(slug));

create index if not exists creator_sweepstakes_creator_created_idx
  on public.creator_sweepstakes (creator_id, created_at desc);

create index if not exists creator_sweepstakes_status_idx
  on public.creator_sweepstakes (status, created_at desc);

drop trigger if exists creator_sweepstakes_set_updated_at on public.creator_sweepstakes;
create trigger creator_sweepstakes_set_updated_at
  before update on public.creator_sweepstakes
  for each row execute function public.set_updated_at();

alter table public.entries
  add column if not exists creator_sweepstakes_id uuid
  references public.creator_sweepstakes(id) on delete set null;

create index if not exists entries_creator_sweepstakes_idx
  on public.entries (creator_sweepstakes_id, created_at desc)
  where creator_sweepstakes_id is not null;

alter table public.creator_sweepstakes enable row level security;

drop policy if exists "Creator sweepstakes: owner read" on public.creator_sweepstakes;
create policy "Creator sweepstakes: owner read"
  on public.creator_sweepstakes for select
  using (auth.uid() = creator_id);

drop policy if exists "Creator sweepstakes: owner update listing" on public.creator_sweepstakes;
create policy "Creator sweepstakes: owner update listing"
  on public.creator_sweepstakes for update
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

grant select, update on public.creator_sweepstakes to authenticated;
grant all on public.creator_sweepstakes to service_role;

insert into storage.buckets (id, name, public)
values ('creator-listings', 'creator-listings', true)
on conflict (id) do nothing;

drop policy if exists "Creator listing public read" on storage.objects;
create policy "Creator listing public read"
  on storage.objects for select
  using (bucket_id = 'creator-listings');

drop policy if exists "Creator listing owner upload" on storage.objects;
create policy "Creator listing owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'creator-listings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Creator listing owner update" on storage.objects;
create policy "Creator listing owner update"
  on storage.objects for update
  using (
    bucket_id = 'creator-listings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Creator listing owner delete" on storage.objects;
create policy "Creator listing owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'creator-listings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 4 — gaviom-otp-codes                                             ║
-- ║  email_verification_codes (compte + futur AMOE)                           ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

create table if not exists public.email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_verification_codes_email_created_idx
  on public.email_verification_codes (lower(email), created_at desc);

create index if not exists email_verification_codes_user_id_idx
  on public.email_verification_codes (user_id);

alter table public.email_verification_codes enable row level security;
-- Pas de policy publique : accès service role (API Vercel) uniquement.


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 5 — gaviom-amoe (online free entry + indexes)                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

create table if not exists public.amoe_submissions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references public.entries(id) on delete set null,
  prize_id text not null,
  sweepstakes_id integer,
  legal_name text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  customer_email text not null,
  phone text not null,
  user_id uuid references auth.users(id) on delete set null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists amoe_submissions_email_prize_idx
  on public.amoe_submissions (lower(customer_email), prize_id, created_at desc);

alter table public.amoe_submissions enable row level security;
-- Service role only (API). No public policies.

create unique index if not exists entries_one_amoe_per_user_prize_idx
  on public.entries (user_id, prize_id)
  where source = 'amoe' and status in ('pending', 'confirmed') and user_id is not null;

create unique index if not exists entries_one_amoe_per_email_prize_idx
  on public.entries (lower(customer_email), prize_id)
  where source = 'amoe' and status in ('pending', 'confirmed');


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 6 — gaviom-verify (lecture seule — ne modifie rien)             ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Décommente et Run pour vérifier après setup :
--
-- select table_name
-- from information_schema.tables
-- where table_schema = 'public'
--   and table_name in (
--     'profiles', 'orders', 'cart_items', 'promo_redemptions',
--     'memberships', 'entries', 'creator_applications',
--     'creator_sweepstakes', 'email_verification_codes'
--   )
-- order by table_name;

notify pgrst, 'reload schema';
