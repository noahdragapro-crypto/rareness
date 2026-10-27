-- Rareness: initial schema.
-- Run once in the Supabase SQL editor (or `supabase db push`).
-- Every table has row-level security on; the browser only ever uses the anon key
-- and the signed-in user's session, so these policies are the real access control.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 24),
  gender text check (gender in ('woman', 'man', 'nonbinary')),
  show_me text not null default 'everyone' check (show_me in ('women', 'men', 'everyone')),
  pronouns text not null default '' check (char_length(pronouns) <= 16),
  city text not null default '' check (char_length(city) <= 40),
  country text check (country ~ '^[A-Z]{2}$'),  -- ISO code; the Cloud shows people from the same country
  job text not null default '' check (char_length(job) <= 40),
  height_cm int check (height_cm between 100 and 250),
  languages text not null default '' check (char_length(languages) <= 60),
  bio text not null default '' check (char_length(bio) <= 160),
  interests text[] not null default '{}',
  status text not null default '' check (char_length(status) <= 20),
  photo_path text,
  -- Aura: how strongly each of the six dimensions shows in this person (0-100), set by /api/aura
  aura jsonb not null default '{"values":50,"lifestyle":50,"interests":50,"personality":50,"goals":50,"routine":50}',
  aura_summary text not null default '',
  aura_updated_at timestamptz,  -- when the aura was last computed
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone signed in can see onboarded profiles (minus blocks, enforced in the view below).
create policy "profiles: read onboarded or own" on public.profiles
  for select to authenticated
  using (onboarded or id = auth.uid());

create policy "profiles: insert own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- True when the current request comes from a signed-in browser (not the server's service role)
create or replace function public.from_browser() returns boolean
language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'authenticated';
$$;

-- Members may not set their own aura from the browser; only the AI matcher does.
create or replace function public.protect_profile_fields() returns trigger
language plpgsql as $$
begin
  if public.from_browser() then
    new.aura := old.aura;
    new.aura_summary := old.aura_summary;
    new.aura_updated_at := old.aura_updated_at;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Private fields: only the member can read them (others see age through cloud()).
-- Billing is written only by the Stripe webhook (service role).
create table public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  birthdate date,
  stripe_customer_id text unique,
  -- One-time access fee, set only by the Stripe webhook
  paid_at timestamptz,
  stripe_session_id text
);
alter table public.profile_private enable row level security;
create policy "private: read own" on public.profile_private for select to authenticated using (id = auth.uid());
create policy "private: insert own" on public.profile_private for insert to authenticated with check (id = auth.uid());
create policy "private: update own" on public.profile_private for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.protect_private_fields() returns trigger
language plpgsql as $$
begin
  if public.from_browser() then
    new.stripe_customer_id := old.stripe_customer_id;
    new.paid_at := old.paid_at;
    new.stripe_session_id := old.stripe_session_id;
  end if;
  return new;
end $$;
create trigger private_protect before update on public.profile_private
  for each row execute function public.protect_private_fields();

-- New auth user -> empty profile rows
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.profile_private (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Answers: sign-up questionnaire and the three daily exercises
-- ---------------------------------------------------------------------------
create table public.answers (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('signup', 'q', 't', 'm')),
  dim text not null check (dim in ('values', 'lifestyle', 'interests', 'personality', 'goals', 'routine')),
  prompt text not null default '',
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, day, kind, dim)
);

alter table public.answers enable row level security;

-- Your own answers; written morning-question answers are also shown on your profile to others.
create policy "answers: read own or public morning answers" on public.answers
  for select to authenticated
  using (user_id = auth.uid() or kind = 'q');

create policy "answers: insert own" on public.answers
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "answers: update own" on public.answers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index answers_user_day on public.answers (user_id, day desc);

-- ---------------------------------------------------------------------------
-- Matches: one row per direction, written by the AI matcher (service role only)
-- ---------------------------------------------------------------------------
create table public.matches (
  user_id uuid not null references public.profiles (id) on delete cascade,
  other_id uuid not null references public.profiles (id) on delete cascade,
  score int not null check (score between 0 and 100),
  dims jsonb not null,          -- {"values": 0-100, ...} how much each reason contributes
  reason text not null default '',
  method text not null default 'ai' check (method in ('ai', 'basic')),
  updated_at timestamptz not null default now(),
  primary key (user_id, other_id)
);

alter table public.matches enable row level security;

create policy "matches: read own" on public.matches
  for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Blocks and reports
-- ---------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.blocks enable row level security;
create policy "blocks: read own" on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy "blocks: insert own" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "blocks: delete own" on public.blocks for delete to authenticated using (blocker_id = auth.uid());

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "reports: insert own" on public.reports for insert to authenticated with check (reporter_id = auth.uid());

-- True when either person blocked the other
create or replace function public.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

-- ---------------------------------------------------------------------------
-- Bumps: secret until mutual. Nobody can read who bumped them.
-- ---------------------------------------------------------------------------
create table public.bumps (
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);
alter table public.bumps enable row level security;
-- You can see only the bumps you sent. Inserts go through bump() below.
create policy "bumps: read sent" on public.bumps for select to authenticated using (from_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Chats and messages: a chat exists only after a mutual bump
-- ---------------------------------------------------------------------------
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
alter table public.chats enable row level security;
create policy "chats: participants read" on public.chats
  for select to authenticated
  using (auth.uid() in (user_a, user_b));

create table public.messages (
  id bigint generated always as identity primary key,
  chat_id uuid not null references public.chats (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete cascade,  -- null = system line
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;

create policy "messages: participants read" on public.messages
  for select to authenticated
  using (exists (select 1 from chats c where c.id = chat_id and auth.uid() in (c.user_a, c.user_b)));

create policy "messages: participants send" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from chats c
      where c.id = chat_id and auth.uid() in (c.user_a, c.user_b)
        and not public.is_blocked(c.user_a, c.user_b)
    )
  );

create index messages_chat_time on public.messages (chat_id, created_at);

create or replace function public.touch_chat() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update chats set last_message_at = new.created_at where id = new.chat_id;
  return new;
end $$;
create trigger messages_touch_chat after insert on public.messages
  for each row execute function public.touch_chat();

-- Read receipts per person (for unread dots)
create table public.chat_reads (
  chat_id uuid not null references public.chats (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);
alter table public.chat_reads enable row level security;
create policy "chat_reads: own" on public.chat_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- bump(target): records your bump. If they already bumped you, opens the chat and
-- returns it. Never reveals a one-sided bump from the other person.
create or replace function public.bump(target uuid) returns json
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  a uuid; b uuid; cid uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  if target = me then raise exception 'cannot bump yourself'; end if;
  if not exists (select 1 from profiles where id = target and onboarded) then raise exception 'unknown person'; end if;
  if public.is_blocked(me, target) then return json_build_object('mutual', false); end if;

  insert into bumps (from_id, to_id) values (me, target) on conflict do nothing;

  if exists (select 1 from bumps where from_id = target and to_id = me) then
    a := least(me, target); b := greatest(me, target);
    insert into chats (user_a, user_b) values (a, b)
      on conflict (user_a, user_b) do update set user_a = excluded.user_a
      returning id into cid;
    if not exists (select 1 from messages where chat_id = cid) then
      insert into messages (chat_id, sender_id, body) values (cid, null, 'You bumped into each other');
    end if;
    return json_build_object('mutual', true, 'chat_id', cid);
  end if;
  return json_build_object('mutual', false);
end $$;

revoke all on function public.bump(uuid) from public;
grant execute on function public.bump(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Cloud: the people you can see, with your match data. Excludes blocks and
-- respects both people's "show me" preference.
-- ---------------------------------------------------------------------------
create or replace function public.cloud() returns table (
  id uuid, name text, age int, city text, job text, status text, photo_path text,
  interests text[], score int, dims jsonb, reason text, bumped boolean, chat_id uuid
)
language sql stable security definer set search_path = public as $$
  with me as (select * from profiles where id = auth.uid())
  select p.id, p.name,
         (select date_part('year', age(v.birthdate))::int from profile_private v where v.id = p.id),
         p.city, p.job, p.status, p.photo_path, p.interests,
         m.score, m.dims, m.reason,
         exists (select 1 from bumps x where x.from_id = auth.uid() and x.to_id = p.id),
         (select c.id from chats c where c.user_a = least(auth.uid(), p.id) and c.user_b = greatest(auth.uid(), p.id))
  from profiles p
  join matches m on m.user_id = auth.uid() and m.other_id = p.id
  cross join me
  where p.onboarded and p.id <> auth.uid()
    and p.country is not distinct from me.country
    and not public.is_blocked(auth.uid(), p.id)
    and (me.show_me = 'everyone' or (me.show_me = 'women' and p.gender = 'woman') or (me.show_me = 'men' and p.gender = 'man'))
    and (p.show_me = 'everyone' or (p.show_me = 'women' and me.gender = 'woman') or (p.show_me = 'men' and me.gender = 'man'))
  order by m.score desc
  limit 200;
$$;
revoke all on function public.cloud() from public;
grant execute on function public.cloud() to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime for chats
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.chats;

-- ---------------------------------------------------------------------------
-- Photo storage: public bucket, each person writes only their own folder
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
  on conflict (id) do nothing;

create policy "photos: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos: update own" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
