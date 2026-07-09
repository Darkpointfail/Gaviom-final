-- Manually confirm a stuck account (Supabase SQL Editor)
-- Replace the email below, then run once.
--
-- Note: confirmed_at is a GENERATED column on newer Supabase projects.
-- Only update email_confirmed_at — confirmed_at updates automatically.

update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where lower(email) = lower('tomcharlesgrosse@gmail.com');

select id, email, email_confirmed_at, confirmed_at
from auth.users
where lower(email) = lower('tomcharlesgrosse@gmail.com');
