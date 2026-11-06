-- While the community is small, everything is open before sign-up is finished: a member's profile can
-- be seen by others as soon as they have a name (the same rule the Cloud uses, see 0004), not only once
-- they've finished sign-up. Private details stay in profile_private.
drop policy if exists "profiles: read onboarded or own" on public.profiles;
drop policy if exists "profiles: read named or own" on public.profiles;
create policy "profiles: read named or own" on public.profiles
  for select to authenticated
  using (coalesce(name, '') <> '' or id = auth.uid());
