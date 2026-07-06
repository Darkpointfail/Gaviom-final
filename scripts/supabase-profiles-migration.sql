-- ═══════════════════════════════════════════════════════════════════════════
-- GAVIOM — profiles table (single source of truth)
-- Run once in Supabase SQL Editor (production + new projects)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create profiles table
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

-- 2. Migrate existing public.users → profiles (if users table exists)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'users'
  ) then
    insert into public.profiles (
      id, email, first_name, last_name, date_of_birth, state,
      marketing_opt_in, created_at
    )
    select
      u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.state,
      coalesce(u.marketing_opt_in, false), coalesce(u.created_at, now())
    from public.users u
    on conflict (id) do update set
      email = excluded.email,
      first_name = coalesce(excluded.first_name, public.profiles.first_name),
      last_name = coalesce(excluded.last_name, public.profiles.last_name),
      date_of_birth = coalesce(excluded.date_of_birth, public.profiles.date_of_birth),
      state = coalesce(excluded.state, public.profiles.state),
      marketing_opt_in = coalesce(excluded.marketing_opt_in, public.profiles.marketing_opt_in),
      updated_at = now();
  end if;
end $$;

-- 3. Trigger: auto-create profile on auth signup
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

-- 4. Trigger: sync profile when auth user updated
create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data is distinct from old.raw_user_meta_data
     or new.email is distinct from old.email then
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
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_updated();

-- 5. Backfill from auth.users for any missing profiles
insert into public.profiles (
  id, email, first_name, last_name, date_of_birth, state, marketing_opt_in
)
select
  u.id,
  coalesce(u.email, ''),
  u.raw_user_meta_data->>'first_name',
  u.raw_user_meta_data->>'last_name',
  nullif(u.raw_user_meta_data->>'date_of_birth', '')::date,
  u.raw_user_meta_data->>'state',
  coalesce((u.raw_user_meta_data->>'marketing_opt_in')::boolean, false)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- 6. Fill empty profile columns from auth metadata
update public.profiles p
set
  first_name = coalesce(nullif(p.first_name, ''), u.raw_user_meta_data->>'first_name'),
  last_name = coalesce(nullif(p.last_name, ''), u.raw_user_meta_data->>'last_name'),
  date_of_birth = coalesce(p.date_of_birth, nullif(u.raw_user_meta_data->>'date_of_birth', '')::date),
  state = coalesce(nullif(p.state, ''), u.raw_user_meta_data->>'state'),
  email = coalesce(nullif(p.email, ''), u.email),
  marketing_opt_in = case
    when p.marketing_opt_in then true
    else coalesce((u.raw_user_meta_data->>'marketing_opt_in')::boolean, false)
  end,
  updated_at = now()
from auth.users u
where u.id = p.id;

-- 7. RPC (legacy recovery only — run manually in SQL Editor, not from the app)
create or replace function public.sync_my_profile_from_auth()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  u record;
  row public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id, email, raw_user_meta_data
  into u
  from auth.users
  where id = auth.uid();

  if u.id is null then
    raise exception 'User not found';
  end if;

  insert into public.profiles (
    id, email, first_name, last_name, date_of_birth, state, marketing_opt_in
  )
  values (
    u.id,
    coalesce(u.email, ''),
    u.raw_user_meta_data->>'first_name',
    u.raw_user_meta_data->>'last_name',
    nullif(u.raw_user_meta_data->>'date_of_birth', '')::date,
    u.raw_user_meta_data->>'state',
    coalesce((u.raw_user_meta_data->>'marketing_opt_in')::boolean, false)
  )
  on conflict (id) do update set
    email = coalesce(nullif(excluded.email, ''), public.profiles.email),
    first_name = coalesce(nullif(excluded.first_name, ''), public.profiles.first_name),
    last_name = coalesce(nullif(excluded.last_name, ''), public.profiles.last_name),
    date_of_birth = coalesce(excluded.date_of_birth, public.profiles.date_of_birth),
    state = coalesce(nullif(excluded.state, ''), public.profiles.state),
    marketing_opt_in = case
      when public.profiles.marketing_opt_in then true
      else coalesce(excluded.marketing_opt_in, public.profiles.marketing_opt_in)
    end,
    updated_at = now()
  returning * into row;

  return row;
end;
$$;

revoke all on function public.sync_my_profile_from_auth() from public;
grant execute on function public.sync_my_profile_from_auth() to authenticated;
