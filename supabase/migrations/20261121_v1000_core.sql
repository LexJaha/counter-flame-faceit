-- CounterFlame FACEIT V1000 core upgrade
-- Applied to the connected Supabase project on 2026-11-21.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.cf_matches
  add column if not exists code text,
  add column if not exists map text not null default 'Random',
  add column if not exists created_by uuid references auth.users(id) on delete set null;

with numbered as (
  select id, lpad((100000 + row_number() over (order by created_at, id))::text, 6, '0') as new_code
  from public.cf_matches where code is null
)
update public.cf_matches m set code = n.new_code from numbered n where m.id = n.id;

create unique index if not exists cf_matches_code_key on public.cf_matches(code);
alter table public.cf_matches alter column code set not null;

create or replace function public.cf_set_match_code()
returns trigger language plpgsql set search_path = public as $$
declare candidate text;
begin
  if new.code is not null and new.code ~ '^[0-9]{6}$' then return new; end if;
  loop
    candidate := lpad((floor(random() * 900000)::integer + 100000)::text, 6, '0');
    exit when not exists (select 1 from public.cf_matches where code = candidate);
  end loop;
  new.code := candidate;
  return new;
end; $$;

drop trigger if exists cf_matches_assign_code on public.cf_matches;
create trigger cf_matches_assign_code before insert on public.cf_matches
for each row execute function public.cf_set_match_code();
revoke all on function public.cf_set_match_code() from public, anon, authenticated;

create unique index if not exists cf_match_players_match_user_key on public.cf_match_players(match_id,user_id);

alter table public.cf_match_results
  add column if not exists status text not null default 'pending',
  add column if not exists claimed_confidence numeric,
  add column if not exists claimed_stats jsonb not null default '[]'::jsonb,
  add column if not exists review_note text not null default '',
  add column if not exists reviewed_by uuid references auth.users(id),
  add column if not exists reviewed_at timestamptz;
alter table public.cf_match_results drop constraint if exists cf_match_results_status_check;
alter table public.cf_match_results add constraint cf_match_results_status_check check (status in ('pending','approved','rejected'));

create table if not exists private.cf_moderators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on private.cf_moderators from public, anon, authenticated;

create or replace function public.cf_is_moderator()
returns boolean language sql stable security definer
set search_path = public, private, auth as $$
  select auth.uid() is not null and exists(select 1 from private.cf_moderators m where m.user_id=auth.uid());
$$;
revoke all on function public.cf_is_moderator() from public, anon;
grant execute on function public.cf_is_moderator() to authenticated;

create table if not exists public.cf_match_evidence (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.cf_matches(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  note text not null default '',
  status text not null default 'pending' check(status in ('pending','reviewed','rejected')),
  created_at timestamptz not null default now(),
  unique(match_id,submitted_by,storage_path)
);
alter table public.cf_match_evidence enable row level security;
drop policy if exists cf_match_evidence_member_read on public.cf_match_evidence;
create policy cf_match_evidence_member_read on public.cf_match_evidence for select to authenticated
using(submitted_by=(select auth.uid()) or public.cf_is_moderator());
drop policy if exists cf_match_evidence_member_insert on public.cf_match_evidence;
create policy cf_match_evidence_member_insert on public.cf_match_evidence for insert to authenticated
with check(submitted_by=(select auth.uid()) and public.cf_is_match_member(match_id) and char_length(storage_path) between 1 and 500);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cf-match-evidence','cf-match-evidence',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
drop policy if exists cf_evidence_upload_own_folder on storage.objects;
create policy cf_evidence_upload_own_folder on storage.objects for insert to authenticated
with check(bucket_id='cf-match-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists cf_evidence_read_owner_or_moderator on storage.objects;
create policy cf_evidence_read_owner_or_moderator on storage.objects for select to authenticated
using(bucket_id='cf-match-evidence' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.cf_is_moderator()));

drop policy if exists cf_direct_threads_member_read on public.cf_direct_threads;
create policy cf_direct_threads_member_read on public.cf_direct_threads for select to authenticated
using(public.cf_is_conversation_member(conversation_id));

create or replace function public.cf_create_match(p_mode text,p_map text default 'Random')
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_me uuid:=auth.uid(); v_match uuid; v_code text;
begin
  if v_me is null then raise exception 'Sign in first.'; end if;
  if p_mode not in ('1v1','2v2','3v3','4v4','5v5') then raise exception 'Unsupported mode.'; end if;
  if char_length(coalesce(p_map,'Random'))>40 then raise exception 'Invalid map.'; end if;
  insert into public.cf_matches(mode,status,map,created_by)
  values(p_mode,'ready',coalesce(nullif(trim(p_map),''),'Random'),v_me)
  returning id,code into v_match,v_code;
  insert into public.cf_match_players(match_id,user_id,team_no) values(v_match,v_me,1);
  return jsonb_build_object('status','created','match_id',v_match,'code',v_code,'mode',p_mode,'map',coalesce(nullif(trim(p_map),''),'Random'));
end; $$;

create or replace function public.cf_join_match_by_code(p_code text)
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare v_me uuid:=auth.uid(); v_match public.cf_matches%rowtype; v_capacity integer; v_team1 integer; v_team2 integer; v_team smallint; v_count integer;
begin
  if v_me is null then raise exception 'Sign in first.'; end if;
  if p_code is null or p_code !~ '^[0-9]{6}$' then raise exception 'Enter a valid six-digit code.'; end if;
  select * into v_match from public.cf_matches where code=p_code for update;
  if not found or v_match.status<>'ready' then raise exception 'Lobby not found or no longer open.'; end if;
  if exists(select 1 from public.cf_match_players where match_id=v_match.id and user_id=v_me) then return v_match.id; end if;
  v_capacity:=case v_match.mode when '1v1' then 2 when '2v2' then 4 when '3v3' then 6 when '4v4' then 8 else 10 end;
  select count(*) into v_count from public.cf_match_players where match_id=v_match.id;
  if v_count>=v_capacity then raise exception 'Lobby is full.'; end if;
  select count(*) filter(where team_no=1),count(*) filter(where team_no=2) into v_team1,v_team2 from public.cf_match_players where match_id=v_match.id;
  v_team:=case when v_team1<=v_team2 then 1 else 2 end;
  insert into public.cf_match_players(match_id,user_id,team_no) values(v_match.id,v_me,v_team);
  return v_match.id;
end; $$;

create or replace function public.cf_submit_result(p_match uuid,p_winner integer,p_score1 integer,p_score2 integer,p_confidence numeric,p_stats jsonb default '[]'::jsonb)
returns void language plpgsql security definer set search_path=public,auth as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if p_winner not in(1,2) then raise exception 'Invalid winning team.'; end if;
  if p_score1 is null or p_score2 is null or p_score1<0 or p_score2<0 or p_score1>99 or p_score2>99 then raise exception 'Invalid score.'; end if;
  if not exists(select 1 from public.cf_match_players where match_id=p_match and user_id=auth.uid()) then raise exception 'You are not a player in this match.'; end if;
  if not exists(select 1 from public.cf_matches where id=p_match and status in('ready','live')) then raise exception 'This match cannot accept a result.'; end if;
  insert into public.cf_match_results(match_id,winner_team,score1,score2,confidence,submitted_by,status,claimed_confidence,claimed_stats)
  values(p_match,p_winner,p_score1,p_score2,null,auth.uid(),'pending',
    case when p_confidence between 0 and 1 then p_confidence else null end,
    case when jsonb_typeof(coalesce(p_stats,'[]'::jsonb))='array' then coalesce(p_stats,'[]'::jsonb) else '[]'::jsonb end);
end; $$;

create or replace function public.cf_review_result(p_match uuid,p_approve boolean,p_note text default '')
returns void language plpgsql security definer set search_path=public,private,auth as $$
declare v_result public.cf_match_results%rowtype;
begin
  if auth.uid() is null or not exists(select 1 from private.cf_moderators where user_id=auth.uid()) then raise exception 'Moderator access required.'; end if;
  select * into v_result from public.cf_match_results where match_id=p_match for update;
  if not found or v_result.status<>'pending' then raise exception 'No pending result found.'; end if;
  if p_approve then
    insert into public.cf_verified_results(match_id,winner_team,confidence,summary)
    values(p_match,v_result.winner_team,1,coalesce(nullif(trim(p_note),''),'Moderator approved evidence'))
    on conflict(match_id) do update set winner_team=excluded.winner_team,confidence=1,summary=excluded.summary,created_at=now();
    update public.profiles p set wins=coalesce(p.wins,0)+1,matches_played=coalesce(p.matches_played,0)+1,elo=least(10000,coalesce(p.elo,1000)+25),updated_at=now()
    from public.cf_match_players mp where mp.match_id=p_match and mp.user_id=p.id and mp.team_no=v_result.winner_team;
    update public.profiles p set losses=coalesce(p.losses,0)+1,matches_played=coalesce(p.matches_played,0)+1,elo=greatest(0,coalesce(p.elo,1000)-25),updated_at=now()
    from public.cf_match_players mp where mp.match_id=p_match and mp.user_id=p.id and mp.team_no<>v_result.winner_team;
    update public.cf_matches set status='completed' where id=p_match;
    update public.cf_match_results set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),review_note=left(coalesce(p_note,''),500) where match_id=p_match;
  else
    update public.cf_match_results set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),review_note=left(coalesce(p_note,''),500) where match_id=p_match;
  end if;
end; $$;

revoke all on function public.cf_create_match(text,text) from public,anon;
revoke all on function public.cf_join_match_by_code(text) from public,anon;
revoke all on function public.cf_submit_result(uuid,integer,integer,integer,numeric,jsonb) from public,anon;
revoke all on function public.cf_review_result(uuid,boolean,text) from public,anon;
grant execute on function public.cf_create_match(text,text) to authenticated;
grant execute on function public.cf_join_match_by_code(text) to authenticated;
grant execute on function public.cf_submit_result(uuid,integer,integer,integer,numeric,jsonb) to authenticated;
grant execute on function public.cf_review_result(uuid,boolean,text) to authenticated;

create table if not exists public.cf_match_messages(
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.cf_matches(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check(char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
alter table public.cf_match_messages enable row level security;
drop policy if exists cf_match_messages_member_read on public.cf_match_messages;
create policy cf_match_messages_member_read on public.cf_match_messages for select to authenticated using(public.cf_is_match_member(match_id));
drop policy if exists cf_match_messages_member_insert on public.cf_match_messages;
create policy cf_match_messages_member_insert on public.cf_match_messages for insert to authenticated with check(sender_id=(select auth.uid()) and public.cf_is_match_member(match_id));
create index if not exists cf_match_messages_match_created_idx on public.cf_match_messages(match_id,created_at);

drop policy if exists cf_matches_open_lobby_read on public.cf_matches;
create policy cf_matches_open_lobby_read on public.cf_matches for select to authenticated using(status='ready' or public.cf_is_match_member(id));

drop policy if exists cf_match_results_moderator_read on public.cf_match_results;
create policy cf_match_results_moderator_read on public.cf_match_results for select to authenticated using(public.cf_is_moderator());

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='cf_matches') then alter publication supabase_realtime add table public.cf_matches; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='cf_match_results') then alter publication supabase_realtime add table public.cf_match_results; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='cf_match_messages') then alter publication supabase_realtime add table public.cf_match_messages; end if;
end $$;


-- Rating updates are allowed only inside the moderator review transaction.
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

create or replace function public.cf_review_result(p_match uuid,p_approve boolean,p_note text default '')
returns void language plpgsql security definer set search_path=public,private,auth as $$
declare v_result public.cf_match_results%rowtype;
begin
  if auth.uid() is null or not exists(select 1 from private.cf_moderators where user_id=auth.uid()) then
    raise exception 'Moderator access required.';
  end if;
  select * into v_result from public.cf_match_results where match_id=p_match for update;
  if not found or v_result.status<>'pending' then raise exception 'No pending result found.'; end if;
  if p_approve then
    insert into public.cf_verified_results(match_id,winner_team,confidence,summary)
    values(p_match,v_result.winner_team,1,coalesce(nullif(trim(p_note),''),'Moderator approved evidence'))
    on conflict(match_id) do update set winner_team=excluded.winner_team,confidence=1,summary=excluded.summary,created_at=now();
    perform set_config('cf.internal_rating_update','on',true);
    update public.profiles p set wins=coalesce(p.wins,0)+1,matches_played=coalesce(p.matches_played,0)+1,
      elo=least(10000,coalesce(p.elo,1000)+25),updated_at=now()
    from public.cf_match_players mp where mp.match_id=p_match and mp.user_id=p.id and mp.team_no=v_result.winner_team;
    update public.profiles p set losses=coalesce(p.losses,0)+1,matches_played=coalesce(p.matches_played,0)+1,
      elo=greatest(0,coalesce(p.elo,1000)-25),updated_at=now()
    from public.cf_match_players mp where mp.match_id=p_match and mp.user_id=p.id and mp.team_no<>v_result.winner_team;
    update public.cf_matches set status='completed' where id=p_match;
    update public.cf_match_results set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),
      review_note=left(coalesce(p_note,''),500) where match_id=p_match;
  else
    update public.cf_match_results set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),
      review_note=left(coalesce(p_note,''),500) where match_id=p_match;
  end if;
end; $$;

-- Queue updates drive live matchmaking status in the client.
do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='cf_match_queue') then
    alter publication supabase_realtime add table public.cf_match_queue;
  end if;
end $$;
