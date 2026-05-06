-- Run this SQL in your Supabase project → SQL Editor

create table transactions (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('income', 'expense')),
  amount      numeric(12, 2) not null check (amount > 0),
  category    text not null,
  description text not null default '',
  date        date not null default current_date,
  created_at  timestamptz not null default now()
);

-- Index for fast month-based queries
create index transactions_date_idx on transactions (date desc);

-- Enable Row Level Security (recommended)
alter table transactions enable row level security;

-- Allow all operations for anonymous users (simple single-user setup)
-- For multi-user, replace with auth.uid() checks
create policy "allow_all" on transactions
  for all
  using (true)
  with check (true);

-- ── Price Records ─────────────────────────────────────────────────────────────
-- Stores Wood Ear mushroom market prices (manually recorded from talaadthai.com)

create table price_records (
  id            uuid primary key default gen_random_uuid(),
  price_low     numeric(10, 2) not null check (price_low > 0),
  price_high    numeric(10, 2) not null check (price_high > 0),
  price         numeric(10, 2) generated always as ((price_low + price_high) / 2) stored,
  unit          text not null default 'kg',
  source        text not null default 'talaadthai.com',
  recorded_date date not null default current_date,
  notes         text not null default '',
  created_at    timestamptz not null default now(),
  -- one record per day (upsert-safe)
  unique (recorded_date)
);

create index price_records_date_idx on price_records (recorded_date desc);

alter table price_records enable row level security;

create policy "allow_all" on price_records
  for all
  using (true)
  with check (true);
