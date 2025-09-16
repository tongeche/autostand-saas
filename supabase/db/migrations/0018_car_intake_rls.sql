-- Allow authenticated users (your app) to read car intake requests
alter table if exists public.car_intake_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='car_intake_requests' and policyname='auth read intake'
  ) then
    create policy "auth read intake" on public.car_intake_requests
      for select to authenticated
      using (true);
  end if;

  -- Optional: allow authenticated inserts (useful for backoffice tools)
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='car_intake_requests' and policyname='auth insert intake'
  ) then
    create policy "auth insert intake" on public.car_intake_requests
      for insert to authenticated
      with check (true);
  end if;
end$$;

