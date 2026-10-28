-- The journal: free writing, as many entries a day as people like. Private to its author and never
-- editable once written (no update or delete policy). It doesn't count toward the daily tasks.
create table if not exists public.journal (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists journal_user_day on public.journal (user_id, day);
alter table public.journal enable row level security;
drop policy if exists "journal: read own" on public.journal;
create policy "journal: read own" on public.journal for select to authenticated using (user_id = auth.uid());
drop policy if exists "journal: insert own" on public.journal;
create policy "journal: insert own" on public.journal for insert to authenticated with check (user_id = auth.uid());
