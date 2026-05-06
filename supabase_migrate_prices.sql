-- Migration: recreate price_records with low/high columns
-- Safe to run even if table already exists

drop table if exists price_records;

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
  unique (recorded_date)
);

create index price_records_date_idx on price_records (recorded_date desc);

alter table price_records enable row level security;

create policy "allow_all" on price_records
  for all
  using (true)
  with check (true);
