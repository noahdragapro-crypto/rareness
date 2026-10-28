-- Daily answers are private: only their author can read them (the AI reads them on the server).
drop policy if exists "answers: read own or public morning answers" on public.answers;
create policy "answers: read own" on public.answers
  for select to authenticated
  using (user_id = auth.uid());
