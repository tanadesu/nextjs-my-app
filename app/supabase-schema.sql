create table if not exists public.players (
  id text primary key,
  name text not null,
  claimed_cells text[] not null default '{}',
  claimed_count integer not null default 0,
  total_cells integer not null default 0,
  percent numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.game_state (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.players enable row level security;
alter table public.game_state enable row level security;

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

drop policy if exists "players can delete rows" on public.players;
create policy "players can delete rows"
on public.players for delete
to anon
using (true);

drop policy if exists "game state can be read" on public.game_state;
create policy "game state can be read"
on public.game_state for select
to anon
using (true);

drop policy if exists "game state can be inserted" on public.game_state;
create policy "game state can be inserted"
on public.game_state for insert
to anon
with check (true);

drop policy if exists "game state can be updated" on public.game_state;
create policy "game state can be updated"
on public.game_state for update
to anon
using (true)
with check (true);

create or replace function public.reset_daily_leaderboard(reset_day text, cell_total integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_reset_day text;
begin
  perform pg_advisory_xact_lock(hashtext('osaka_jintorigassen_daily_reset'));

  select value
  into current_reset_day
  from public.game_state
  where key = 'leaderboard_reset_day';

  if current_reset_day = reset_day then
    return 'already_reset';
  end if;

  delete from public.players
  where id <> '__never_match__';

  insert into public.game_state (key, value, updated_at)
  values ('leaderboard_reset_day', reset_day, now())
  on conflict (key) do update
  set
    value = excluded.value,
    updated_at = excluded.updated_at;

  return 'reset';
end;
$$;

grant execute on function public.reset_daily_leaderboard(text, integer) to anon;
