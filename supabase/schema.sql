create extension if not exists pgcrypto;
create table if not exists public.profiles(id uuid primary key references auth.users(id) on delete cascade,username text not null unique,elo integer not null default 1000 check(elo between 0 and 9999999),avatar_url text,created_at timestamptz not null default now());
create table if not exists public.matches(id uuid primary key default gen_random_uuid(),code char(6) not null unique check(code ~ '^[0-9]{6}$'),mode text not null check(mode in('5v5','1v1')),map text not null,status text not null default 'open' check(status in('open','live','pending_review','verified','rejected','cancelled')),host_id uuid not null references auth.users(id),winner_team text check(winner_team in('A','B')),created_at timestamptz not null default now());
create table if not exists public.match_players(id uuid primary key default gen_random_uuid(),match_id uuid not null references public.matches(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,team text not null check(team in('A','B')),joined_at timestamptz not null default now(),unique(match_id,user_id));
create table if not exists public.match_messages(id uuid primary key default gen_random_uuid(),match_id uuid not null references public.matches(id) on delete cascade,sender_id uuid not null references auth.users(id) on delete cascade,body text not null check(char_length(body) between 1 and 1000),created_at timestamptz not null default now());
create table if not exists public.match_evidence(id uuid primary key default gen_random_uuid(),match_id uuid not null references public.matches(id) on delete cascade,submitted_by uuid not null references auth.users(id),image_url text not null check(image_url like 'https://%'),note text,review_status text not null default 'pending' check(review_status in('pending','approved','rejected')),reviewer_id uuid references auth.users(id),created_at timestamptz not null default now());
create or replace function public.is_match_player(target_match uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.match_players where match_id=target_match and user_id=auth.uid()); $$;
alter table public.profiles enable row level security; alter table public.matches enable row level security; alter table public.match_players enable row level security; alter table public.match_messages enable row level security; alter table public.match_evidence enable row level security;
create policy "profiles readable" on public.profiles for select to authenticated using(true);
create policy "profile insert self" on public.profiles for insert to authenticated with check(id=auth.uid());
create policy "profile update self" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy "matches readable" on public.matches for select to authenticated using(true);
create policy "host creates match" on public.matches for insert to authenticated with check(host_id=auth.uid());
create policy "host updates match" on public.matches for update to authenticated using(host_id=auth.uid()) with check(host_id=auth.uid());
create policy "players readable" on public.match_players for select to authenticated using(true);
create policy "player joins as self" on public.match_players for insert to authenticated with check(user_id=auth.uid());
-- Enforce lobby capacity on the database, not only in the browser.
create or replace function public.enforce_lobby_capacity()
returns trigger language plpgsql security definer set search_path=public as $
declare
  lobby_mode text;
  lobby_status text;
  player_count integer;
  max_players integer;
begin
  select mode,status into lobby_mode,lobby_status from public.matches where id=new.match_id for update;
  if lobby_status <> 'open' then raise exception 'This lobby is no longer open'; end if;
  select count(*) into player_count from public.match_players where match_id=new.match_id;
  max_players := case when lobby_mode='1v1' then 2 else 10 end;
  if player_count >= max_players then raise exception 'This lobby is full'; end if;
  return new;
end;
$;
drop trigger if exists check_lobby_capacity on public.match_players;
create trigger check_lobby_capacity before insert on public.match_players for each row execute procedure public.enforce_lobby_capacity();
create or replace function public.mark_lobby_full()
returns trigger language plpgsql security definer set search_path=public as $
declare
  player_count integer;
  max_players integer;
begin
  select count(*) into player_count from public.match_players where match_id=new.match_id;
  select case when mode='1v1' then 2 else 10 end into max_players from public.matches where id=new.match_id;
  if player_count >= max_players then update public.matches set status='live' where id=new.match_id and status='open'; end if;
  return new;
end;
$;
drop trigger if exists mark_lobby_full_after_join on public.match_players;
create trigger mark_lobby_full_after_join after insert on public.match_players for each row execute procedure public.mark_lobby_full();
create policy "player leaves self" on public.match_players for delete to authenticated using(user_id=auth.uid());
create policy "chat readable to players" on public.match_messages for select to authenticated using(public.is_match_player(match_id));
create policy "players send chat" on public.match_messages for insert to authenticated with check(sender_id=auth.uid() and public.is_match_player(match_id));
create policy "evidence readable to players" on public.match_evidence for select to authenticated using(public.is_match_player(match_id));
create policy "players submit evidence" on public.match_evidence for insert to authenticated with check(submitted_by=auth.uid() and public.is_match_player(match_id));
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,username) values(new.id,coalesce(nullif(new.raw_user_meta_data->>'username',''),split_part(new.email,'@',1))) on conflict(id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
do $
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='match_messages'
  ) then
    alter publication supabase_realtime add table public.match_messages;
  end if;
end $;


-- Public aggregate counters for the matchmaking screen. No player identities are exposed.
create or replace function public.cf_get_matchmaking_counts()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  with mode_list(mode) as (
    values ('1v1'::text), ('2v2'::text), ('3v3'::text), ('4v4'::text), ('5v5'::text)
  ),
  queue_counts as (
    select q.mode, count(*)::integer as queued
    from public.cf_match_queue q
    where q.match_id is null
      and q.joined_at >= now() - interval '30 minutes'
    group by q.mode
  ),
  playing_counts as (
    select m.mode, count(distinct mp.user_id)::integer as playing
    from public.cf_matches m
    join public.cf_match_players mp on mp.match_id = m.id
    where m.status = 'live'
       or (m.status = 'ready' and m.created_at >= now() - interval '30 minutes')
    group by m.mode
  )
  select jsonb_build_object(
    'modes',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'mode', ml.mode,
          'queued', coalesce(qc.queued, 0),
          'playing', coalesce(pc.playing, 0)
        ) order by ml.mode
      ),
      '[]'::jsonb
    ),
    'updated_at', now()
  )
  from mode_list ml
  left join queue_counts qc on qc.mode = ml.mode
  left join playing_counts pc on pc.mode = ml.mode;
$function$;

revoke all on function public.cf_get_matchmaking_counts() from public;
grant execute on function public.cf_get_matchmaking_counts() to anon, authenticated;
