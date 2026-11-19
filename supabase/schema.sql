-- Tender Profit Tracker: run in Supabase SQL Editor.
create table if not exists public.tenders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tender_date date not null,
  lot_number text not null,
  platform text not null,
  lot_amount numeric(18,2) not null default 0 check (lot_amount >= 0),
  tax numeric(18,2) not null default 0 check (tax >= 0),
  cost_price numeric(18,2) not null default 0 check (cost_price >= 0),
  extra_expenses numeric(18,2) not null default 0 check (extra_expenses >= 0),
  profit numeric(18,2) generated always as (lot_amount - tax - cost_price - extra_expenses) stored,
  payment_status text not null default 'pending' check (payment_status in ('pending','partial','paid')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tenders_owner_date_idx on public.tenders(owner_id,tender_date desc);
create index if not exists tenders_owner_platform_idx on public.tenders(owner_id,platform);
create or replace function public.touch_tender_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;
drop trigger if exists tender_updated_at on public.tenders;
create trigger tender_updated_at before update on public.tenders for each row execute function public.touch_tender_updated_at();
alter table public.tenders enable row level security;
drop policy if exists "owner reads own tenders" on public.tenders;
create policy "owner reads own tenders" on public.tenders for select to authenticated using (owner_id=(select auth.uid()));
drop policy if exists "owner inserts own tenders" on public.tenders;
create policy "owner inserts own tenders" on public.tenders for insert to authenticated with check (owner_id=(select auth.uid()));
drop policy if exists "owner updates own tenders" on public.tenders;
create policy "owner updates own tenders" on public.tenders for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
drop policy if exists "owner deletes own tenders" on public.tenders;
create policy "owner deletes own tenders" on public.tenders for delete to authenticated using (owner_id=(select auth.uid()));
