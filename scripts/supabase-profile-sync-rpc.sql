-- Run in Supabase SQL Editor — ONE-TIME legacy recovery only.
-- Do NOT call from the frontend app on normal My Account loads.
-- Prefer scripts/supabase-run-in-dashboard-now.sql for bulk users → profiles migration.

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
