-- Vérifier qu'un compte a bien un profil (remplace l'email)
-- Supabase → SQL Editor → Run

select
  u.id as auth_id,
  u.email as auth_email,
  u.raw_user_meta_data->>'first_name' as meta_first,
  u.raw_user_meta_data->>'last_name' as meta_last,
  p.id as profile_id,
  p.email as profile_email,
  p.first_name,
  p.last_name,
  p.state,
  p.date_of_birth
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) = lower('REMPLACE@PAR.TON.EMAIL')
   or u.id = 'REMPLACE-PAR-UUID-SI-BESOIN';

-- Tous les profils
select id, email, first_name, last_name, state from public.profiles order by email;
