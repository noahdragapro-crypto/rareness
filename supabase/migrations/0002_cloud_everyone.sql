-- Everyone in your country who fits both people's "show me" appears in the Cloud right away,
-- even before their match has been scored (they float mid-distance until it is).
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
  cross join me
  left join matches m on m.user_id = auth.uid() and m.other_id = p.id
  where p.onboarded and p.id <> auth.uid()
    and p.country is not distinct from me.country
    and not public.is_blocked(auth.uid(), p.id)
    and (me.show_me = 'everyone' or (me.show_me = 'women' and p.gender = 'woman') or (me.show_me = 'men' and p.gender = 'man'))
    and (p.show_me = 'everyone' or (p.show_me = 'women' and me.gender = 'woman') or (p.show_me = 'men' and me.gender = 'man'))
  order by m.score desc nulls last
  limit 200;
$$;
revoke all on function public.cloud() from public;
grant execute on function public.cloud() to authenticated;
