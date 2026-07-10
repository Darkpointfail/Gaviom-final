-- Run in Supabase SQL Editor (dashboard).
-- Creator applications + profile access flag for dashboard gating.

-- ── 1. Statut creator sur profiles ─────────────────────────────────────────

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

-- ── 2. Table candidatures ───────────────────────────────────────────────────

create table if not exists public.creator_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Personal
  name text not null,
  email text not null,
  country text not null,
  social_url text not null,

  -- Creator profile
  creator_name text not null,
  category text not null,
  audience_size text not null,
  platforms text not null,
  engagement text not null,

  -- Sweepstakes idea
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

-- Une seule candidature "ouverte" (pending / under_review) par utilisateur
create unique index if not exists creator_applications_one_open_per_user_idx
  on public.creator_applications (user_id)
  where status in ('pending', 'under_review');

-- ── 3. updated_at auto ──────────────────────────────────────────────────────

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

-- ── 4. RLS ──────────────────────────────────────────────────────────────────

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

-- Pas de policy UPDATE/DELETE côté client :
-- validation admin via service role (API Vercel) uniquement.

-- ── 5. Permissions ──────────────────────────────────────────────────────────

grant select, insert on public.creator_applications to authenticated;
grant all on public.creator_applications to service_role;

notify pgrst, 'reload schema';

-- Vérification
-- select column_name, data_type from information_schema.columns
-- where table_schema = 'public' and table_name = 'creator_applications';
