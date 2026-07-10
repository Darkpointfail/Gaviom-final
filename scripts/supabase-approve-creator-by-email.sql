-- Approve a creator by email (replace the email address).
-- Run in Supabase → SQL Editor.

-- 1) Find the user + latest open application
select
  p.id as user_id,
  p.email,
  p.creator_status,
  ca.id as application_id,
  ca.creator_name,
  ca.status as application_status,
  ca.created_at
from public.profiles p
left join lateral (
  select id, creator_name, status, created_at
  from public.creator_applications
  where user_id = p.id
  order by created_at desc
  limit 1
) ca on true
where lower(p.email) = lower('tomcharlesgrosse@gmail.com');

-- 2) Approve (run after step 1 confirms the row exists)
with target as (
  select id as user_id
  from public.profiles
  where lower(email) = lower('tomcharlesgrosse@gmail.com')
  limit 1
)
update public.creator_applications ca
set
  status = 'approved',
  reviewed_at = now(),
  reviewed_by = 'admin@getgaviom.com'
from target t
where ca.user_id = t.user_id
  and ca.status in ('pending', 'under_review');

with target as (
  select id as user_id
  from public.profiles
  where lower(email) = lower('tomcharlesgrosse@gmail.com')
  limit 1
)
update public.profiles p
set
  creator_status = 'approved',
  creator_approved_at = now()
from target t
where p.id = t.user_id;

-- 3) Verify
select id, email, creator_status, creator_approved_at
from public.profiles
where lower(email) = lower('tomcharlesgrosse@gmail.com');
