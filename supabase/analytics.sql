-- Anonymous play analytics, on the same free project as the leaderboard.
-- Nothing here is readable with the public key: the game can only append
-- through track(). IPs are never stored; a daily rotating hash is kept only to
-- rate-limit. Read the stats_* views from the Supabase dashboard (SQL editor).

create table public.visits (
  id uuid primary key,
  visitor uuid,
  started_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  repeat_visit boolean,
  country text,
  device text,
  os text,
  browser text,
  lang text,
  tz text,
  screen text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  challenge boolean,
  dev boolean,
  host text,
  ip_day text,
  events int not null default 0
);
create table public.events (
  id bigserial primary key,
  visit uuid not null references public.visits(id) on delete cascade,
  at timestamptz not null default now(),
  t real,
  name text not null,
  board smallint,
  data jsonb
);
create index events_visit on public.events(visit);
create index events_name_at on public.events(name, at);
create index visits_started on public.visits(started_at);
create index visits_ip_day on public.visits(ip_day, started_at);
alter table public.visits enable row level security;
alter table public.events enable row level security;

create or replace function public.track(p_visit uuid, p_info jsonb, p_events jsonb)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  hdr json := coalesce(current_setting('request.headers', true), '{}')::json;
  who text := md5(public.client_ip() || current_date::text || 'pac-ram');
  n int := least(coalesce(jsonb_array_length(p_events), 0), 60);
  have int;
begin
  if p_visit is null then return; end if;
  if not exists (select 1 from public.visits v where v.id = p_visit) then
    if (select count(*) from public.visits v where v.ip_day = who and v.started_at > now() - interval '1 hour') >= 300 then
      return;
    end if;
    insert into public.visits (id, visitor, repeat_visit, country, device, os, browser, lang, tz, screen,
      referrer, utm_source, utm_medium, utm_campaign, challenge, dev, host, ip_day)
    values (
      p_visit,
      case when (p_info->>'visitor') ~ '^[0-9a-f-]{36}$' then (p_info->>'visitor')::uuid end,
      (p_info->>'repeat')::boolean,
      left(coalesce(hdr->>'cf-ipcountry', p_info->>'country'), 8),
      left(p_info->>'device', 16), left(p_info->>'os', 16), left(p_info->>'browser', 16),
      left(p_info->>'lang', 16), left(p_info->>'tz', 48), left(p_info->>'screen', 16),
      left(p_info->>'referrer', 200), left(p_info->>'utm_source', 64), left(p_info->>'utm_medium', 64),
      left(p_info->>'utm_campaign', 64), (p_info->>'challenge')::boolean, (p_info->>'dev')::boolean,
      left(p_info->>'host', 64), who)
    on conflict (id) do nothing;
  end if;
  select v.events into have from public.visits v where v.id = p_visit;
  if have is null or have >= 800 or n = 0 then return; end if;
  n := least(n, 800 - have);
  insert into public.events (visit, t, name, board, data)
  select p_visit, (e->>'t')::real, left(e->>'n', 32), (e->>'b')::smallint,
    case when pg_column_size(e->'d') < 2000 then e->'d' end
  from jsonb_array_elements(p_events) with ordinality as x(e, i)
  where i <= n and coalesce(e->>'n', '') <> '';
  update public.visits set events = events + n, last_at = now() where id = p_visit;
end $$;

revoke all on function public.track(uuid, jsonb, jsonb) from public;
grant execute on function public.track(uuid, jsonb, jsonb) to anon, authenticated;

-- shared connections (offices, campuses) start many runs; give them room
create or replace function public.start_run()
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  who text := public.client_ip();
  rid uuid;
begin
  if (select count(*) from public.runs r where r.ip = who and r.started_at > now() - interval '1 hour') >= 200 then
    raise exception 'too many runs';
  end if;
  insert into public.runs (ip) values (who) returning id into rid;
  return rid;
end $$;

-- Read-side views. Test-mode visits (?dev) are left out.
create view public.stats_daily with (security_invoker = true) as
select (v.started_at at time zone 'utc')::date as day,
  count(*) as visits,
  count(distinct v.visitor) as visitors,
  count(*) filter (where exists (select 1 from public.events e where e.visit = v.id and e.name = 'run')) as played,
  count(*) filter (where exists (select 1 from public.events e where e.visit = v.id and e.name = 'escaped')) as escaped,
  count(*) filter (where exists (select 1 from public.events e where e.visit = v.id and e.name = 'share')) as shared,
  round(avg(extract(epoch from v.last_at - v.started_at))) as avg_seconds
from public.visits v where not coalesce(v.dev, false)
group by 1 order by 1 desc;

create view public.stats_funnel with (security_invoker = true) as
select s.step, count(distinct v.id) as visits
from (values (1, 'visit'), (2, 'run'), (3, 'board 1'), (4, 'board 2'), (5, 'board 3'),
  (6, 'finale'), (7, 'escaped'), (8, 'named'), (9, 'share')) s(i, step)
left join public.visits v on not coalesce(v.dev, false) and (s.step = 'visit' or exists (
  select 1 from public.events e where e.visit = v.id and (e.name = s.step or (e.name = 'board' and s.step = 'board ' || (e.board + 1)))))
group by s.i, s.step order by s.i;

create view public.stats_sources with (security_invoker = true) as
select coalesce(nullif(utm_source, ''), nullif(split_part(split_part(referrer, '://', 2), '/', 1), ''),
  case when challenge then 'challenge link' else 'direct' end) as source,
  count(*) as visits, count(distinct visitor) as visitors
from public.visits where not coalesce(dev, false) group by 1 order by 2 desc;

create view public.stats_places with (security_invoker = true) as
select coalesce(country, '?') as country, tz, device, count(*) as visits
from public.visits where not coalesce(dev, false) group by 1, 2, 3 order by 4 desc;

create view public.stats_deaths with (security_invoker = true) as
select e.board + 1 as board, e.data->>'by' as caught_by, count(*) as deaths
from public.events e join public.visits v on v.id = e.visit and not coalesce(v.dev, false)
where e.name = 'death' group by 1, 2 order by 1, 3 desc;

create view public.stats_choices with (security_invoker = true) as
select e.data->>'q' as question, e.data->>'a' as answer, count(*) as picks
from public.events e join public.visits v on v.id = e.visit and not coalesce(v.dev, false)
where e.name = 'choice' group by 1, 2 order by 1, 3 desc;

revoke all on public.stats_daily, public.stats_funnel, public.stats_sources, public.stats_places,
  public.stats_deaths, public.stats_choices from anon, authenticated;
