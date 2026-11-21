-- CounterFlame FACEIT V1000 base schema.
-- Run this once on a fresh Supabase project before the V1000 core upgrade migration.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check(char_length(username) between 3 and 20),
  elo integer not null default 1000 check(elo between 0 and 9999999),
  matches_played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  bio text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists matches_played integer not null default 0;
alter table public.profiles add column if not exists wins integer not null default 0;
alter table public.profiles add column if not exists losses integer not null default 0;
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.cf_matches (
  id uuid primary key default gen_random_uuid(),
  mode text not null check(mode in('1v1','2v2','3v3','4v4','5v5')),
  status text not null default 'ready' check(status in('ready','live','completed','cancelled')),
  created_at timestamptz not null default now()
);
create table if not exists public.cf_match_queue (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null check(mode in('1v1','2v2','3v3','4v4','5v5')),
  elo integer not null default 1000,
  joined_at timestamptz not null default now(),
  match_id uuid references public.cf_matches(id) on delete set null
);
create table if not exists public.cf_match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.cf_matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_no smallint not null check(team_no in(1,2)),
  created_at timestamptz not null default now(),
  unique(match_id,user_id)
);
create table if not exists public.cf_match_results (
  match_id uuid primary key references public.cf_matches(id) on delete cascade,
  winner_team integer not null check(winner_team in(1,2)),
  score1 integer,
  score2 integer,
  confidence numeric,
  submitted_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.cf_match_stats (
  match_id uuid not null references public.cf_matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_no integer,
  kills integer not null default 0,
  deaths integer not null default 0,
  assists integer not null default 0,
  created_at timestamptz not null default now(),
  primary key(match_id,user_id)
);
create table if not exists public.cf_verified_results (
  match_id uuid primary key references public.cf_matches(id) on delete cascade,
  winner_team integer,
  confidence numeric not null default 0,
  summary text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.cf_is_match_member(p_match uuid)
returns boolean language sql stable security definer
set search_path=public,auth as $$
  select exists(select 1 from public.cf_match_players p where p.match_id=p_match and p.user_id=auth.uid());
$$;

create or replace function public.cf_guard_profile_stats()
returns trigger language plpgsql set search_path=public,auth as $$
begin
  if current_setting('cf.internal_rating_update',true)='on' then return new; end if;
  if auth.uid() is not null then
    if tg_op='INSERT' then
      new.elo:=1000; new.wins:=0; new.losses:=0; new.matches_played:=0;
    else
      new.elo:=old.elo; new.wins:=old.wins; new.losses:=old.losses; new.matches_played:=old.matches_played;
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists cf_profiles_guard_stats on public.profiles;
create trigger cf_profiles_guard_stats before insert or update on public.profiles
for each row execute function public.cf_guard_profile_stats();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,username)
  values(new.id,coalesce(nullif(new.raw_user_meta_data->>'username',''),left(split_part(new.email,'@',1),20)))
  on conflict(id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.cf_join_matchmaking(p_mode text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  v_me uuid:=auth.uid(); v_size integer; v_elo integer; v_match uuid; v_count integer;
  v_player record; v_i integer:=0; v_wait_seconds integer:=0; v_gap integer:=200;
begin
  if v_me is null then raise exception 'Sign in first.'; end if;
  if p_mode not in('1v1','2v2','3v3','4v4','5v5') then raise exception 'Unsupported game mode.'; end if;
  v_size:=case p_mode when '1v1' then 2 when '2v2' then 4 when '3v3' then 6 when '4v4' then 8 else 10 end;
  perform pg_advisory_xact_lock(hashtext('cf_matchmaking:'||p_mode)::bigint);
  select match_id into v_match from public.cf_match_queue where user_id=v_me;
  if v_match is not null then
    return jsonb_build_object('status','matched','mode',p_mode,'match_id',v_match,'players_found',v_size,'players_needed',v_size,'elo_range',1000);
  end if;
  delete from public.cf_match_queue where match_id is null and joined_at<now()-interval '30 minutes';
  select coalesce(elo,1000) into v_elo from public.profiles where id=v_me;
  if v_elo is null then
    insert into public.profiles(id,username,elo,wins,losses)
    values(v_me,coalesce((select raw_user_meta_data->>'username' from auth.users where id=v_me),'Player'),1000,0,0)
    on conflict(id) do nothing;
    v_elo:=1000;
  end if;
  insert into public.cf_match_queue(user_id,mode,elo,joined_at,match_id)
  values(v_me,p_mode,v_elo,now(),null)
  on conflict(user_id) do update set mode=excluded.mode,elo=excluded.elo,
    joined_at=case when public.cf_match_queue.mode=excluded.mode and public.cf_match_queue.match_id is null
      then public.cf_match_queue.joined_at else now() end,match_id=null;
  select greatest(0,extract(epoch from now()-joined_at)::integer) into v_wait_seconds
  from public.cf_match_queue where user_id=v_me;
  v_gap:=least(1000,200+(floor(v_wait_seconds/30.0)::integer*100));
  select count(*) into v_count from (
    select user_id from public.cf_match_queue
    where mode=p_mode and match_id is null and abs(elo-v_elo)<=v_gap
    order by joined_at,user_id limit v_size
  ) waiting;
  if v_count<v_size then
    return jsonb_build_object('status','waiting','mode',p_mode,'players_found',v_count,'players_needed',v_size,'elo_range',v_gap);
  end if;
  insert into public.cf_matches(mode,status) values(p_mode,'ready') returning id into v_match;
  for v_player in
    select user_id from public.cf_match_queue
    where mode=p_mode and match_id is null and abs(elo-v_elo)<=v_gap
    order by elo desc,joined_at,user_id limit v_size for update
  loop
    v_i:=v_i+1;
    update public.cf_match_queue set match_id=v_match where user_id=v_player.user_id;
    insert into public.cf_match_players(match_id,user_id,team_no)
    values(v_match,v_player.user_id,case when mod(v_i-1,4) in(0,3) then 1 else 2 end);
  end loop;
  return jsonb_build_object('status','matched','mode',p_mode,'match_id',v_match,'players_found',v_size,'players_needed',v_size,'elo_range',v_gap);
end; $$;

create or replace function public.cf_leave_matchmaking()
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare v_deleted integer;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  delete from public.cf_match_queue where user_id=auth.uid();
  get diagnostics v_deleted=row_count;
  return v_deleted>0;
end; $$;

alter table public.profiles enable row level security;
alter table public.cf_matches enable row level security;
alter table public.cf_match_queue enable row level security;
alter table public.cf_match_players enable row level security;
alter table public.cf_match_results enable row level security;
alter table public.cf_match_stats enable row level security;
alter table public.cf_verified_results enable row level security;

drop policy if exists cf_profiles_public_read on public.profiles;
create policy cf_profiles_public_read on public.profiles for select to anon,authenticated using(true);
drop policy if exists cf_profiles_insert_own on public.profiles;
create policy cf_profiles_insert_own on public.profiles for insert to authenticated with check(id=(select auth.uid()));
drop policy if exists cf_profiles_update_own on public.profiles;
create policy cf_profiles_update_own on public.profiles for update to authenticated
using(id=(select auth.uid())) with check(id=(select auth.uid()));

drop policy if exists cf_matches_member_read on public.cf_matches;
create policy cf_matches_member_read on public.cf_matches for select to authenticated
using(public.cf_is_match_member(id));
drop policy if exists cf_match_players_member_read on public.cf_match_players;
create policy cf_match_players_member_read on public.cf_match_players for select to authenticated
using(public.cf_is_match_member(match_id));
drop policy if exists cf_match_queue_own_read on public.cf_match_queue;
create policy cf_match_queue_own_read on public.cf_match_queue for select to authenticated
using(user_id=(select auth.uid()));
drop policy if exists cf_match_stats_public_read on public.cf_match_stats;
create policy cf_match_stats_public_read on public.cf_match_stats for select to authenticated using(true);
drop policy if exists cf_verified_results_member_read on public.cf_verified_results;
create policy cf_verified_results_member_read on public.cf_verified_results for select to authenticated
using(public.cf_is_match_member(match_id));

grant select on public.profiles to anon,authenticated;
grant insert,update on public.profiles to authenticated;
grant select on public.cf_matches,public.cf_match_players,public.cf_match_queue,
  public.cf_match_results,public.cf_match_stats,public.cf_verified_results to authenticated;
grant execute on function public.cf_is_match_member(uuid) to authenticated;
grant execute on function public.cf_join_matchmaking(text) to authenticated;
grant execute on function public.cf_leave_matchmaking() to authenticated;

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='cf_match_players') then
    alter publication supabase_realtime add table public.cf_match_players;
  end if;
end $$;

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='cf_match_queue') then
    alter publication supabase_realtime add table public.cf_match_queue;
  end if;
end $$;

-- Ensure fully populated rooms transition from ready to live.
create or replace function public.cf_join_match_by_code(p_code text)
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare
  v_me uuid:=auth.uid(); v_match public.cf_matches%rowtype; v_capacity integer;
  v_team1 integer; v_team2 integer; v_team smallint; v_count integer;
begin
  if v_me is null then raise exception 'Sign in first.'; end if;
  if p_code is null or p_code !~ '^[0-9]{6}$' then raise exception 'Enter a valid six-digit code.'; end if;
  select * into v_match from public.cf_matches where code=p_code for update;
  if not found or v_match.status<>'ready' then raise exception 'Lobby not found or no longer open.'; end if;
  if exists(select 1 from public.cf_match_players where match_id=v_match.id and user_id=v_me) then return v_match.id; end if;
  v_capacity:=case v_match.mode when '1v1' then 2 when '2v2' then 4 when '3v3' then 6 when '4v4' then 8 else 10 end;
  select count(*) into v_count from public.cf_match_players where match_id=v_match.id;
  if v_count>=v_capacity then raise exception 'Lobby is full.'; end if;
  select count(*) filter(where team_no=1),count(*) filter(where team_no=2)
    into v_team1,v_team2 from public.cf_match_players where match_id=v_match.id;
  v_team:=case when v_team1<=v_team2 then 1 else 2 end;
  insert into public.cf_match_players(match_id,user_id,team_no) values(v_match.id,v_me,v_team);
  select count(*) into v_count from public.cf_match_players where match_id=v_match.id;
  if v_count>=v_capacity then update public.cf_matches set status='live' where id=v_match.id; end if;
  return v_match.id;
end; $$;

create or replace function public.cf_join_matchmaking(p_mode text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  v_me uuid:=auth.uid(); v_size integer; v_elo integer; v_match uuid; v_count integer;
  v_player record; v_i integer:=0; v_wait_seconds integer:=0; v_gap integer:=200;
begin
  if v_me is null then raise exception 'Sign in first.'; end if;
  if p_mode not in('1v1','2v2','3v3','4v4','5v5') then raise exception 'Unsupported game mode.'; end if;
  v_size:=case p_mode when '1v1' then 2 when '2v2' then 4 when '3v3' then 6 when '4v4' then 8 else 10 end;
  perform pg_advisory_xact_lock(hashtext('cf_matchmaking:'||p_mode)::bigint);
  select match_id into v_match from public.cf_match_queue where user_id=v_me;
  if v_match is not null then
    return jsonb_build_object('status','matched','mode',p_mode,'match_id',v_match,'players_found',v_size,'players_needed',v_size,'elo_range',1000);
  end if;
  delete from public.cf_match_queue where match_id is null and joined_at<now()-interval '30 minutes';
  select coalesce(elo,1000) into v_elo from public.profiles where id=v_me;
  if v_elo is null then
    insert into public.profiles(id,username,elo,wins,losses)
    values(v_me,coalesce((select raw_user_meta_data->>'username' from auth.users where id=v_me),'Player'),1000,0,0)
    on conflict(id) do nothing;
    v_elo:=1000;
  end if;
  insert into public.cf_match_queue(user_id,mode,elo,joined_at,match_id)
  values(v_me,p_mode,v_elo,now(),null)
  on conflict(user_id) do update set mode=excluded.mode,elo=excluded.elo,
    joined_at=case when public.cf_match_queue.mode=excluded.mode and public.cf_match_queue.match_id is null
      then public.cf_match_queue.joined_at else now() end,match_id=null;
  select greatest(0,extract(epoch from now()-joined_at)::integer) into v_wait_seconds
  from public.cf_match_queue where user_id=v_me;
  v_gap:=least(1000,200+(floor(v_wait_seconds/30.0)::integer*100));
  select count(*) into v_count from (
    select user_id from public.cf_match_queue where mode=p_mode and match_id is null
      and abs(elo-v_elo)<=v_gap order by joined_at,user_id limit v_size
  ) waiting;
  if v_count<v_size then
    return jsonb_build_object('status','waiting','mode',p_mode,'players_found',v_count,'players_needed',v_size,'elo_range',v_gap);
  end if;
  insert into public.cf_matches(mode,status) values(p_mode,'ready') returning id into v_match;
  for v_player in
    select user_id from public.cf_match_queue where mode=p_mode and match_id is null
      and abs(elo-v_elo)<=v_gap order by elo desc,joined_at,user_id limit v_size for update
  loop
    v_i:=v_i+1;
    update public.cf_match_queue set match_id=v_match where user_id=v_player.user_id;
    insert into public.cf_match_players(match_id,user_id,team_no)
    values(v_match,v_player.user_id,case when mod(v_i-1,4) in(0,3) then 1 else 2 end);
  end loop;
  update public.cf_matches set status='live' where id=v_match;
  return jsonb_build_object('status','matched','mode',p_mode,'match_id',v_match,'players_found',v_size,'players_needed',v_size,'elo_range',v_gap);
end; $$;
