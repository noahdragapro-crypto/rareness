-- Read receipts: both people in a chat can see when the other last read it.
create policy "chat_reads: participants read" on public.chat_reads
  for select to authenticated
  using (exists (select 1 from chats c where c.id = chat_id and auth.uid() in (c.user_a, c.user_b)));
