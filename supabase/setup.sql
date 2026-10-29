-- PAC RAM global leaderboard. Run once in the Supabase SQL editor.
-- Anyone may read scores and add one; nobody can change or delete them
-- through the public key. The checks keep obviously fake scores out.

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 12 and name ~ '^[A-Z0-9 ._-]+$'),
  score integer not null check (score between 1 and 100000),
  level smallint not null check (level between 0 and 3),
  escaped boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists scores_week on public.scores (created_at desc, score desc);
create index if not exists scores_name_recent on public.scores (name, created_at desc);

alter table public.scores enable row level security;

drop policy if exists "read scores" on public.scores;
create policy "read scores" on public.scores for select to anon, authenticated using (true);

drop policy if exists "add a score" on public.scores;
create policy "add a score" on public.scores for insert to anon, authenticated
  with check (char_length(name) between 1 and 12 and score between 1 and 100000);

-- At most 5 scores a minute under the same name, to slow spam.
create or replace function public.scores_rate_limit() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.scores s where s.name = new.name and s.created_at > now() - interval '1 minute') >= 5 then
    raise exception 'slow down';
  end if;
  new.created_at := now();
  return new;
end $$;

drop trigger if exists scores_rate_limit on public.scores;
create trigger scores_rate_limit before insert on public.scores for each row execute function public.scores_rate_limit();

-- Verified runs. Scores can only be added through submit_score, for a run the
-- server saw start, once, and only if the score is possible in the time since.
create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ip text not null default ''
);
create index if not exists runs_ip_recent on public.runs (ip, started_at desc);
alter table public.runs enable row level security;

drop policy if exists "add a score" on public.scores;

create or replace function public.client_ip() returns text
language sql stable
set search_path = ''
as $$
  select trim(split_part(coalesce((current_setting('request.headers', true))::json->>'x-forwarded-for', ''), ',', 1))
$$;

create or replace function public.start_run() returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  who text := public.client_ip();
  rid uuid;
begin
  if (select count(*) from public.runs r where r.ip = who and r.started_at > now() - interval '1 hour') >= 60 then
    raise exception 'too many runs';
  end if;
  insert into public.runs (ip) values (who) returning id into rid;
  return rid;
end $$;

create or replace function public.submit_score(run uuid, p_name text, p_score integer, p_level integer, p_escaped boolean)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  r public.runs%rowtype;
  elapsed double precision;
  cap integer;
  min_time integer;
  week_start timestamptz := date_trunc('week', now());
  place integer;
begin
  select * into r from public.runs where id = run for update;
  if not found or r.finished_at is not null then
    raise exception 'invalid run';
  end if;
  if r.started_at < now() - interval '4 hours' then
    raise exception 'run expired';
  end if;
  if p_escaped and p_level <> 3 then
    raise exception 'implausible';
  end if;
  if p_level < 0 or p_level > 3 then
    raise exception 'implausible';
  end if;
  elapsed := extract(epoch from now() - r.started_at);
  cap := case when p_escaped then 62000 when p_level >= 2 then 47000 when p_level = 1 then 21000 else 7500 end;
  min_time := case when p_escaped then 150 else 15 + p_level * 40 end;
  if elapsed < min_time or p_score > cap or p_score > elapsed * 400 then
    raise exception 'implausible';
  end if;
  update public.runs set finished_at = now() where id = run;
  insert into public.scores (name, score, level, escaped) values (p_name, p_score, p_level, p_escaped);
  select count(*) + 1 into place from public.scores s where s.created_at >= week_start and s.score > p_score;
  return place;
end $$;

revoke all on function public.start_run() from public;
revoke all on function public.submit_score(uuid, text, integer, integer, boolean) from public;
revoke all on function public.client_ip() from public;
grant execute on function public.start_run() to anon, authenticated;
grant execute on function public.submit_score(uuid, text, integer, integer, boolean) to anon, authenticated;
