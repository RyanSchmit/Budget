-- Net worth snapshots (per-account breakdown)
-- Designed for Supabase Postgres + RLS (auth.uid()).

create extension if not exists pgcrypto;

-- 1) Tables
create table if not exists public.net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  snapshot_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint net_worth_snapshots_user_date_uniq unique (user_id, snapshot_date)
);

create index if not exists net_worth_snapshots_user_date_idx
  on public.net_worth_snapshots (user_id, snapshot_date desc);

create table if not exists public.net_worth_snapshot_accounts (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.net_worth_snapshots (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  account_key text null,
  account_name text not null,
  amount numeric(14, 2) not null,
  account_type text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint net_worth_snapshot_accounts_type_chk
    check (account_type in ('asset', 'liability')),
  constraint net_worth_snapshot_accounts_key_chk
    check (account_key is null or account_key in ('checking', 'credit_card'))
);

create index if not exists net_worth_snapshot_accounts_snapshot_idx
  on public.net_worth_snapshot_accounts (snapshot_id, sort_order);

create index if not exists net_worth_snapshot_accounts_user_idx
  on public.net_worth_snapshot_accounts (user_id);

-- 2) updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_net_worth_snapshots_updated_at on public.net_worth_snapshots;
create trigger set_net_worth_snapshots_updated_at
before update on public.net_worth_snapshots
for each row execute function public.set_updated_at();

-- 3) RLS
alter table public.net_worth_snapshots enable row level security;
alter table public.net_worth_snapshot_accounts enable row level security;

drop policy if exists "net worth snapshots: select own" on public.net_worth_snapshots;
create policy "net worth snapshots: select own"
  on public.net_worth_snapshots
  for select
  using (user_id = auth.uid());

drop policy if exists "net worth snapshots: insert own" on public.net_worth_snapshots;
create policy "net worth snapshots: insert own"
  on public.net_worth_snapshots
  for insert
  with check (user_id = auth.uid());

drop policy if exists "net worth snapshots: update own" on public.net_worth_snapshots;
create policy "net worth snapshots: update own"
  on public.net_worth_snapshots
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "net worth snapshots: delete own" on public.net_worth_snapshots;
create policy "net worth snapshots: delete own"
  on public.net_worth_snapshots
  for delete
  using (user_id = auth.uid());

drop policy if exists "net worth accounts: select own" on public.net_worth_snapshot_accounts;
create policy "net worth accounts: select own"
  on public.net_worth_snapshot_accounts
  for select
  using (user_id = auth.uid());

drop policy if exists "net worth accounts: insert own" on public.net_worth_snapshot_accounts;
create policy "net worth accounts: insert own"
  on public.net_worth_snapshot_accounts
  for insert
  with check (user_id = auth.uid());

drop policy if exists "net worth accounts: update own" on public.net_worth_snapshot_accounts;
create policy "net worth accounts: update own"
  on public.net_worth_snapshot_accounts
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "net worth accounts: delete own" on public.net_worth_snapshot_accounts;
create policy "net worth accounts: delete own"
  on public.net_worth_snapshot_accounts
  for delete
  using (user_id = auth.uid());

-- 4) RPC: upsert snapshot + replace account lines (transactional)
-- Call from supabase-js: supabase.rpc('save_net_worth_snapshot', { p_snapshot_date, p_accounts })
create or replace function public.save_net_worth_snapshot(
  p_snapshot_date date,
  p_accounts jsonb
) returns uuid
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
  v_snapshot_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.net_worth_snapshots (user_id, snapshot_date)
  values (v_user_id, p_snapshot_date)
  on conflict (user_id, snapshot_date)
  do update set updated_at = now()
  returning id into v_snapshot_id;

  delete from public.net_worth_snapshot_accounts
  where snapshot_id = v_snapshot_id
    and user_id = v_user_id;

  insert into public.net_worth_snapshot_accounts (
    snapshot_id,
    user_id,
    account_key,
    account_name,
    amount,
    account_type,
    sort_order
  )
  select
    v_snapshot_id,
    v_user_id,
    nullif(a->>'key', '')::text,
    (a->>'name')::text,
    (a->>'amount')::numeric,
    (a->>'type')::text,
    coalesce((a->>'sort_order')::int, 0)
  from jsonb_array_elements(coalesce(p_accounts, '[]'::jsonb)) a;

  return v_snapshot_id;
end;
$$;

revoke all on function public.save_net_worth_snapshot(date, jsonb) from public;
grant execute on function public.save_net_worth_snapshot(date, jsonb) to authenticated;

