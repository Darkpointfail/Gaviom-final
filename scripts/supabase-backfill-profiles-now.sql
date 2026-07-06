-- Run once in Supabase SQL Editor if My Account fields are empty after migration.
-- Fills missing profiles + empty columns from auth.users metadata.

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

grant select, insert, update on public.profiles to authenticated;
notify pgrst, 'reload schema';

select id, email, first_name, last_name, state from public.profiles order by email;
