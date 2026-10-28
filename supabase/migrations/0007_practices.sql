-- Practices: each finished session from the Meditation library, with its level and the short
-- check-in answer that follows it. Only the member can read their own sessions (the AI reads them
-- on the server). People you've bumped with can see which practices you do most, never your answers.
create table if not exists public.practices (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise text not null check (char_length(exercise) between 1 and 40),
  level int not null default 1 check (level between 1 and 4),
  minutes int check (minutes between 0 and 240),
  day date not null,
  answer jsonb not null default '{}'::jsonb check (pg_column_size(answer) < 8000),
  created_at timestamptz not null default now()
);
create index if not exists practices_user_day on public.practices (user_id, day);
alter table public.practices enable row level security;
drop policy if exists "practices: read own" on public.practices;
create policy "practices: read own" on public.practices for select to authenticated using (user_id = auth.uid());
drop policy if exists "practices: insert own" on public.practices;
create policy "practices: insert own" on public.practices for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "practices: update own" on public.practices;
create policy "practices: update own" on public.practices for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "practices: delete own" on public.practices;
create policy "practices: delete own" on public.practices for delete to authenticated using (user_id = auth.uid());

-- What someone practises most: for yourself, or for someone you share a chat with
create or replace function public.practice_summary(target uuid) returns table (exercise text, sessions int, last_day date)
language sql stable security definer set search_path = public as $$
  select p.exercise, count(*)::int, max(p.day)
  from practices p
  where p.user_id = target
    and (target = auth.uid() or exists (
      select 1 from chats c where c.user_a = least(auth.uid(), target) and c.user_b = greatest(auth.uid(), target)))
  group by p.exercise
  order by count(*) desc, max(p.day) desc
  limit 6;
$$;
revoke all on function public.practice_summary(uuid) from public;
grant execute on function public.practice_summary(uuid) to authenticated;
