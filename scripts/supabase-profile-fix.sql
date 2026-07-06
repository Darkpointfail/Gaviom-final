-- Backfill profile names from auth signup metadata (run once in Supabase SQL Editor)
update public.profiles p
set
  first_name = coalesce(nullif(p.first_name, ''), u.raw_user_meta_data->>'first_name'),
  last_name = coalesce(nullif(p.last_name, ''), u.raw_user_meta_data->>'last_name'),
  date_of_birth = coalesce(p.date_of_birth, nullif(u.raw_user_meta_data->>'date_of_birth', '')::date),
  state = coalesce(nullif(p.state, ''), u.raw_user_meta_data->>'state'),
  marketing_opt_in = coalesce(
    p.marketing_opt_in,
    coalesce((u.raw_user_meta_data->>'marketing_opt_in')::boolean, false)
  ),
  updated_at = now()
from auth.users u
where u.id = p.id
  and (
    p.first_name is null or p.first_name = ''
    or p.last_name is null or p.last_name = ''
  );
