-- Manually confirm a stuck account (Supabase SQL Editor)
-- Replace the email below, then run once.

update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  confirmed_at = coalesce(confirmed_at, now())
where lower(email) = lower('tomcharlesgrosse@gmail.com');

select id, email, email_confirmed_at, confirmed_at
from auth.users
where lower(email) = lower('tomcharlesgrosse@gmail.com');
