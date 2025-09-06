-- RLS policies for public.cars to allow tenant-scoped CRUD

alter table if exists public.cars enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='cars' and policyname='cars_select'
  ) then
    create policy "cars_select" on public.cars
      for select to authenticated
      using (
        exists (
          select 1 from public.org_members m
          where m.org_id = cars.org_id and m.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='cars' and policyname='cars_insert'
  ) then
    create policy "cars_insert" on public.cars
      for insert to authenticated
      with check (
        exists (
          select 1 from public.org_members m
          where m.org_id = cars.org_id and m.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='cars' and policyname='cars_update'
  ) then
    create policy "cars_update" on public.cars
      for update to authenticated
      using (
        exists (
          select 1 from public.org_members m
          where m.org_id = cars.org_id and m.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.org_members m
          where m.org_id = cars.org_id and m.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='cars' and policyname='cars_delete'
  ) then
    create policy "cars_delete" on public.cars
      for delete to authenticated
      using (
        exists (
          select 1 from public.org_members m
          where m.org_id = cars.org_id and m.user_id = auth.uid()
        )
      );
  end if;
end$$;

