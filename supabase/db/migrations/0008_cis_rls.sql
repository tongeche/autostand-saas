-- RLS policies for cars_import_staging to allow tenant-scoped inserts/updates/deletes

alter table if exists public.cars_import_staging enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='cars_import_staging' and policyname='cis_insert'
  ) then
    create policy "cis_insert" on public.cars_import_staging
      for insert to authenticated
      with check (
        exists (
          select 1 from public.org_members m
          where m.org_id = coalesce(cars_import_staging.org_id, cars_import_staging.tenant_id)
            and m.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='cars_import_staging' and policyname='cis_update'
  ) then
    create policy "cis_update" on public.cars_import_staging
      for update to authenticated
      using (
        exists (
          select 1 from public.org_members m
          where m.org_id = coalesce(cars_import_staging.org_id, cars_import_staging.tenant_id)
            and m.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.org_members m
          where m.org_id = coalesce(cars_import_staging.org_id, cars_import_staging.tenant_id)
            and m.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='cars_import_staging' and policyname='cis_delete'
  ) then
    create policy "cis_delete" on public.cars_import_staging
      for delete to authenticated
      using (
        exists (
          select 1 from public.org_members m
          where m.org_id = coalesce(cars_import_staging.org_id, cars_import_staging.tenant_id)
            and m.user_id = auth.uid()
        )
      );
  end if;

  -- Optional: broaden SELECT to allow rows keyed by org_id as well as tenant_id
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='cars_import_staging' and policyname='cis_select_org'
  ) then
    create policy "cis_select_org" on public.cars_import_staging
      for select to authenticated
      using (
        exists (
          select 1 from public.org_members m
          where m.org_id = coalesce(cars_import_staging.org_id, cars_import_staging.tenant_id)
            and m.user_id = auth.uid()
        )
      );
  end if;
end$$;

