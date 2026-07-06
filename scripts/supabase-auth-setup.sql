-- Run in Supabase SQL Editor after enabling Email in Sign In / Providers
--
-- REQUIRED in Supabase Dashboard (not SQL):
--   Authentication → Providers → Email → turn ON "Confirm email"
--   Authentication → URL Configuration → add Site URL: https://gaviom.com
--   Redirect URLs: https://gaviom.com/signin.html
--
-- Without "Confirm email", new accounts skip verification and can sign in immediately.
--
-- For existing projects with public.users, run supabase-profiles-migration.sql instead.

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
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, first_name, last_name, date_of_birth, state, marketing_opt_in
  )
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
