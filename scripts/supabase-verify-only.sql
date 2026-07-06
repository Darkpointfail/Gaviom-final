-- ═══════════════════════════════════════════════════════════════════════════
-- VÉRIFICATION ONLY — doit AFFICHER des lignes (pas "No rows returned")
-- Supabase → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. La table profiles existe-t-elle et combien de lignes ?
select count(*) as total_profiles from public.profiles;

-- 2. Contenu de profiles (doit lister tes comptes)
select id, email, first_name, last_name, state, date_of_birth
from public.profiles
order by email;

-- 3. Comparaison auth.users vs profiles (trou = compte sans profil)
select
  u.id,
  u.email,
  u.raw_user_meta_data->>'first_name' as meta_first,
  u.raw_user_meta_data->>'last_name' as meta_last,
  p.first_name as profile_first,
  p.last_name as profile_last,
  case when p.id is null then 'MANQUANT' else 'OK' end as profile_status
from auth.users u
left join public.profiles p on p.id = u.id
order by u.email;

-- 4. Ancienne table users (référence)
select id, email, first_name, last_name, state
from public.users
order by email;
