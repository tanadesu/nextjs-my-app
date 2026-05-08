create table if not exists public.players (
  id text primary key,
  name text not null,
  claimed_cells text[] not null default '{}',
  claimed_count integer not null default 0,
  total_cells integer not null default 0,
  percent numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.players enable row level security;

drop policy if exists "players can read leaderboard" on public.players;
create policy "players can read leaderboard"
on public.players for select
to anon
using (true);

drop policy if exists "players can insert own row" on public.players;
create policy "players can insert own row"
on public.players for insert
to anon
with check (true);

drop policy if exists "players can update rows" on public.players;
create policy "players can update rows"
on public.players for update
to anon
using (true)
with check (true);
