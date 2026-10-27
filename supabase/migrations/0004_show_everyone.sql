-- While the community is small: everyone who has an account and a name shows in everyone's Cloud,
-- whatever their country or "looking for", and even before they finish sign-up. Blocks still apply.
-- To go back to the stricter rules later, run 0003_friends_test.sql (or 0002 for one country).
create or replace function public.cloud() returns table (
  id uuid, name text, age int, city text, job text, status text, photo_path text,
  interests text[], score int, dims jsonb, reason text, bumped boolean, chat_id uuid
)
language sql stable security definer set search_path = public as $$
  select p.id, p.name,
         (select date_part('year', age(v.birthdate))::int from profile_private v where v.id = p.id),
         p.city, p.job, p.status, p.photo_path, p.interests,
         m.score, m.dims, m.reason,
         exists (select 1 from bumps x where x.from_id = auth.uid() and x.to_id = p.id),
         (select c.id from chats c where c.user_a = least(auth.uid(), p.id) and c.user_b = greatest(auth.uid(), p.id))
  from profiles p
  left join matches m on m.user_id = auth.uid() and m.other_id = p.id
  where p.id <> auth.uid()
    and coalesce(p.name, '') <> ''
    and not public.is_blocked(auth.uid(), p.id)
  order by m.score desc nulls last, p.created_at desc
  limit 200;
$$;
revoke all on function public.cloud() from public;
grant execute on function public.cloud() to authenticated;
