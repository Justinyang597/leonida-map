-- Community pins for the Leonida map.
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
--
-- Visitors can read visible pins and call the three functions below.
-- They can never write to the tables directly. To moderate, open
-- Table Editor → community_pins and delete rows (votes/reports go with them).

create table if not exists public.community_pins (
  id          uuid primary key default gen_random_uuid(),
  x           double precision not null check (x between -16384 and 16384),
  y           double precision not null check (y between -16384 and 16384),
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  note        text not null default '' check (char_length(note) <= 500),
  kind        text not null default 'other'
              check (kind in ('collectible','easteregg','vehicle','weapon','stunt','activity','other')),
  score       integer not null default 0,
  reports     integer not null default 0,
  author      text not null,           -- hashed IP, never the raw address
  created_at  timestamptz not null default now()
);
create index if not exists community_pins_author_time on public.community_pins (author, created_at);

create table if not exists public.pin_votes (
  pin_id uuid not null references public.community_pins on delete cascade,
  voter  text not null,
  value  smallint not null check (value in (-1, 1)),
  primary key (pin_id, voter)
);

create table if not exists public.pin_reports (
  pin_id uuid not null references public.community_pins on delete cascade,
  voter  text not null,
  primary key (pin_id, voter)
);

-- Lock the tables: anyone may read pins that aren't voted down or reported; nothing else.
alter table public.community_pins enable row level security;
alter table public.pin_votes      enable row level security;
alter table public.pin_reports    enable row level security;

drop policy if exists "read visible pins" on public.community_pins;
create policy "read visible pins" on public.community_pins
  for select using (score > -5 and reports < 3);

revoke all on public.community_pins, public.pin_votes, public.pin_reports from anon, authenticated;
grant select (id, x, y, name, note, kind, score, created_at) on public.community_pins to anon, authenticated;

-- Who is calling: a salted hash of the caller's IP (from the API gateway headers).
create or replace function public.caller_hash() returns text
language sql stable as $$
  select md5('leonida-map:' || coalesce(
    nullif(current_setting('request.headers', true)::json ->> 'cf-connecting-ip', ''),
    nullif(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1), ''),
    'unknown'))
$$;

create or replace function public.add_pin(p_x double precision, p_y double precision,
                                          p_name text, p_note text, p_kind text)
returns public.community_pins
language plpgsql security definer set search_path = public as $$
declare
  me  text := caller_hash();
  row public.community_pins;
begin
  if (select count(*) from community_pins where author = me and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate_limited' using hint = 'You can add up to 10 pins per hour.';
  end if;
  insert into community_pins (x, y, name, note, kind, author)
  values (p_x, p_y, btrim(p_name), coalesce(btrim(p_note), ''), coalesce(p_kind, 'other'), me)
  returning * into row;
  row.author := '';
  return row;
end $$;

-- value: 1 = upvote, -1 = downvote, 0 = remove my vote. Returns the new score.
create or replace function public.vote_pin(p_id uuid, p_value integer)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  me text := caller_hash();
  new_score integer;
begin
  if p_value = 0 then
    delete from pin_votes where pin_id = p_id and voter = me;
  elsif p_value in (-1, 1) then
    insert into pin_votes (pin_id, voter, value) values (p_id, me, p_value)
    on conflict (pin_id, voter) do update set value = excluded.value;
  else
    raise exception 'bad_vote';
  end if;
  update community_pins
     set score = coalesce((select sum(value) from pin_votes where pin_id = p_id), 0)
   where id = p_id
  returning score into new_score;
  return new_score;
end $$;

create or replace function public.report_pin(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into pin_reports (pin_id, voter) values (p_id, caller_hash()) on conflict do nothing;
  update community_pins set reports = (select count(*) from pin_reports where pin_id = p_id) where id = p_id;
end $$;

revoke all on function public.add_pin, public.vote_pin, public.report_pin, public.caller_hash from public;
grant execute on function public.add_pin, public.vote_pin, public.report_pin to anon, authenticated;
