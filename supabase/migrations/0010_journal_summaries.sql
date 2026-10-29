-- One sentence per journal page, written once (by the AI when it's set up) and kept, so the
-- Reflecting list doesn't ask for it again. Readable only by the page's author; written by the server.
create table if not exists public.journal_summaries (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  summary text not null check (char_length(summary) <= 300),
  method text not null default 'ai' check (method in ('ai', 'basic')),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.journal_summaries enable row level security;
drop policy if exists "journal_summaries: read own" on public.journal_summaries;
create policy "journal_summaries: read own" on public.journal_summaries for select to authenticated using (user_id = auth.uid());
