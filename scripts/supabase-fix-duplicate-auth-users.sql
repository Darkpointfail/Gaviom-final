-- Find duplicate auth users by email (should return 0 rows in a healthy project).
select lower(email) as email, count(*) as user_count, array_agg(id::text order by created_at) as user_ids
from auth.users
where email is not null and email <> ''
group by lower(email)
having count(*) > 1;

-- Inspect a specific email (replace with yours):
-- select id, email, email_confirmed_at, confirmed_at, created_at
-- from auth.users
-- where lower(email) = lower('your@email.com')
-- order by created_at;

-- Manual cleanup for ONE email: keep the newest unconfirmed user, delete older duplicates.
-- Only run after reviewing the select above. Replace the email below.
--
-- with ranked as (
--   select id,
--          row_number() over (partition by lower(email) order by created_at desc) as rn
--   from auth.users
--   where lower(email) = lower('your@email.com')
-- )
-- delete from auth.users
-- where id in (select id from ranked where rn > 1);
