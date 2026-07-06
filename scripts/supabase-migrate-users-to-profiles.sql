-- ═══════════════════════════════════════════════════════════════════════════
-- GAVIOM — Migration minimale users → profiles
-- Copie TOUT ce fichier dans Supabase → SQL Editor → Run
-- (Ne pas réutiliser une ancienne version du script)
-- ═══════════════════════════════════════════════════════════════════════════

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

-- Migration : uniquement les colonnes de public.users (sans avatar_url, etc.)
insert into public.profiles (
  id,
  email,
  first_name,
  last_name,
  date_of_birth,
  state,
  marketing_opt_in,
  created_at
)
select
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.date_of_birth,
  u.state,
  coalesce(u.marketing_opt_in, false),
  coalesce(u.created_at, now())
from public.users u
on conflict (id) do update set
  email = excluded.email,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  date_of_birth = excluded.date_of_birth,
  state = excluded.state,
  marketing_opt_in = excluded.marketing_opt_in,
  updated_at = now();

-- Trigger signup → profiles
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

-- Sync metadata when auth user is updated (email confirm, etc.)
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

-- Permissions API + reload schema cache
grant usage on schema public to postgres, anon, authenticated, service_role;
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;

notify pgrst, 'reload schema';

-- Backfill champs vides depuis auth.users (comptes récents)
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

-- Vérification : doit afficher tes comptes avec prénom/nom
select id, email, first_name, last_name, state from public.profiles order by email;
