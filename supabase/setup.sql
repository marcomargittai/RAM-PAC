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
