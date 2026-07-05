-- Run after supabase-auth-setup.sql and supabase-orders-setup.sql

alter table public.users
  add column if not exists avatar_url text,
  add column if not exists promo_code text,
  add column if not exists stripe_customer_id text;

-- Allow users to read their own orders by email
alter table public.orders alter column stripe_session_id drop not null;

drop policy if exists "orders_service_only" on public.orders;

create policy "Users read own orders by email"
  on public.orders for select
  using (lower(customer_email) = lower(auth.jwt() ->> 'email'));

-- Service role still inserts via webhook (bypasses RLS)

-- Avatar uploads (public read, owner write)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar public read" on storage.objects;
create policy "Avatar public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Avatar owner upload" on storage.objects;
create policy "Avatar owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Avatar owner update" on storage.objects;
create policy "Avatar owner update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Avatar owner delete" on storage.objects;
create policy "Avatar owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
