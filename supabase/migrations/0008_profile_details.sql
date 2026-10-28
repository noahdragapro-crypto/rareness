-- Extra profile details chosen in Edit profile (meditation experience, peace temple, what you're here for…)
alter table public.profiles add column if not exists details jsonb not null default '{}'::jsonb;
alter table public.profiles drop constraint if exists profiles_details_size;
alter table public.profiles add constraint profiles_details_size check (pg_column_size(details) < 4000);
