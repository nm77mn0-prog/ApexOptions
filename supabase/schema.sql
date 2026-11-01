-- ApexOptions V3 development schema.
-- Demo ledger only. Never store real-money balances in a client-editable table.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferred_language text not null default 'en' check (preferred_language in ('en','ar')),
  created_at timestamptz not null default now()
);

create table if not exists public.demo_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency text not null default 'USD',
  balance numeric(18,2) not null default 10000.00 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.demo_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  direction text not null check (direction in ('up','down')),
  stake numeric(18,2) not null check (stake > 0),
  expiry_seconds integer not null check (expiry_seconds between 5 and 3600),
  status text not null default 'simulated' check (status in ('simulated','won','lost','void')),
  simulated_result numeric(18,2),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.demo_wallets enable row level security;
alter table public.demo_trades enable row level security;

create policy "read own profile" on public.profiles for select using (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "read own demo wallet" on public.demo_wallets for select using (auth.uid() = user_id);
create policy "read own demo trades" on public.demo_trades for select using (auth.uid() = user_id);

-- Wallet and trade writes must be implemented through validated server-side
-- functions/RPCs. Do not grant direct client INSERT/UPDATE permissions.
