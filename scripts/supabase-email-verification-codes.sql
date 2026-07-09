-- Run in Supabase SQL Editor (service role / dashboard).
-- OTP email verification — replaces Supabase confirmation links.

create table if not exists public.email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_verification_codes_email_created_idx
  on public.email_verification_codes (lower(email), created_at desc);

create index if not exists email_verification_codes_user_id_idx
  on public.email_verification_codes (user_id);

alter table public.email_verification_codes enable row level security;

-- No public policies: only service role (Vercel API) accesses this table.
