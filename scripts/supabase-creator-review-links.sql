-- Pending creator applications → Approve / Reject links (for when admin email was not received).
-- Run in Supabase → SQL Editor.

select
  id,
  creator_name,
  email,
  status,
  created_at,
  'https://gaviom.com/api/creator-application-review?token=' || review_token || '&action=approve' as approve_url,
  'https://gaviom.com/api/creator-application-review?token=' || review_token || '&action=reject' as reject_url
from public.creator_applications
where status in ('pending', 'under_review')
  and review_token is not null
order by created_at desc;
