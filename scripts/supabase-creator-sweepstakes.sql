-- Run in Supabase SQL Editor (dashboard).
-- Creator sweepstakes + listing storage for dynamic creator dashboard.

-- ── 1. Creator sweepstakes ───────────────────────────────────────────────────

create table if not exists public.creator_sweepstakes (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.creator_applications(id) on delete set null,

  slug text not null,
  prize_id text not null,

  title text not null,
  public_title text,
  description text,
  cover_image_url text,
  gallery jsonb not null default '[]'::jsonb,

  prize_name text not null,
  prize_value_usd numeric(12, 2) not null default 0,
  ticket_price_usd numeric(10, 2) not null default 10,
  entry_cap integer not null default 1000,
  fee_pct numeric(5, 4) not null default 0.15,

  status text not null default 'review'
    check (status in ('draft', 'review', 'live', 'ended', 'cancelled')),
  emoji text not null default '🎁',
  draw_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint creator_sweepstakes_prize_value_check check (prize_value_usd >= 0),
  constraint creator_sweepstakes_ticket_price_check check (ticket_price_usd > 0),
  constraint creator_sweepstakes_entry_cap_check check (entry_cap > 0),
  constraint creator_sweepstakes_fee_pct_check check (fee_pct >= 0 and fee_pct < 1)
);

create unique index if not exists creator_sweepstakes_prize_id_uidx
  on public.creator_sweepstakes (prize_id);

create unique index if not exists creator_sweepstakes_creator_slug_uidx
  on public.creator_sweepstakes (creator_id, lower(slug));

create index if not exists creator_sweepstakes_creator_created_idx
  on public.creator_sweepstakes (creator_id, created_at desc);

create index if not exists creator_sweepstakes_status_idx
  on public.creator_sweepstakes (status, created_at desc);

drop trigger if exists creator_sweepstakes_set_updated_at on public.creator_sweepstakes;
create trigger creator_sweepstakes_set_updated_at
  before update on public.creator_sweepstakes
  for each row execute function public.set_updated_at();

-- ── 2. Link entries to creator sweepstakes (optional fast lookup) ─────────────

alter table public.entries
  add column if not exists creator_sweepstakes_id uuid
  references public.creator_sweepstakes(id) on delete set null;

create index if not exists entries_creator_sweepstakes_idx
  on public.entries (creator_sweepstakes_id, created_at desc)
  where creator_sweepstakes_id is not null;

-- ── 3. RLS ───────────────────────────────────────────────────────────────────

alter table public.creator_sweepstakes enable row level security;

drop policy if exists "Creator sweepstakes: owner read" on public.creator_sweepstakes;
create policy "Creator sweepstakes: owner read"
  on public.creator_sweepstakes for select
  using (auth.uid() = creator_id);

drop policy if exists "Creator sweepstakes: owner update listing" on public.creator_sweepstakes;
create policy "Creator sweepstakes: owner update listing"
  on public.creator_sweepstakes for update
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

grant select, update on public.creator_sweepstakes to authenticated;
grant all on public.creator_sweepstakes to service_role;

-- ── 4. Listing images storage ────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('creator-listings', 'creator-listings', true)
on conflict (id) do nothing;

drop policy if exists "Creator listing public read" on storage.objects;
create policy "Creator listing public read"
  on storage.objects for select
  using (bucket_id = 'creator-listings');

drop policy if exists "Creator listing owner upload" on storage.objects;
create policy "Creator listing owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'creator-listings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Creator listing owner update" on storage.objects;
create policy "Creator listing owner update"
  on storage.objects for update
  using (
    bucket_id = 'creator-listings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Creator listing owner delete" on storage.objects;
create policy "Creator listing owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'creator-listings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

notify pgrst, 'reload schema';
