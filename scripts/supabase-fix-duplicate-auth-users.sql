-- Diagnostic complet pour un email (remplace l'adresse ci-dessous).
-- "No rows returned" sur la requête doublons = pas de doublons évidents,
-- mais un compte orphelin (sans email) peut quand même bloquer la confirmation.

-- 1) Comptes auth avec cet email
select id, email, email_confirmed_at, confirmed_at, created_at
from auth.users
where lower(coalesce(email, '')) = lower('YOUR_EMAIL_HERE')
order by created_at desc;

-- 2) Codes OTP récents pour cet email
select id, user_id, email, attempts, expires_at, verified_at, created_at
from public.email_verification_codes
where lower(email) = lower('YOUR_EMAIL_HERE')
order by created_at desc
limit 10;

-- 3) Profils liés à cet email
select id, email, first_name, last_name, created_at
from public.profiles
where lower(email) = lower('YOUR_EMAIL_HERE')
order by created_at desc;

-- 4) Comptes auth SANS email (orphelins — souvent la vraie cause)
select id, email, email_confirmed_at, created_at
from auth.users
where email is null or btrim(email) = ''
order by created_at desc
limit 20;

-- 5) Doublons exacts par email (ta requête précédente)
select lower(email) as email, count(*) as user_count, array_agg(id::text order by created_at) as user_ids
from auth.users
where email is not null and btrim(email) <> ''
group by lower(email)
having count(*) > 1;

-- 6) Déblocage manuel pour UN email (à utiliser seulement après diagnostic)
-- Remplace YOUR_EMAIL_HERE, puis décommente :
--
-- update auth.users
-- set email_confirmed_at = coalesce(email_confirmed_at, now()),
--     confirmed_at = coalesce(confirmed_at, now())
-- where lower(email) = lower('YOUR_EMAIL_HERE');
