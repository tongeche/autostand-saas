-- RLS for templates to allow simple dev CRUD by authenticated users

alter table if exists public.templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='templates' and policyname='templates_read'
  ) then
    create policy "templates_read" on public.templates
      for select to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='templates' and policyname='templates_insert'
  ) then
    create policy "templates_insert" on public.templates
      for insert to authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='templates' and policyname='templates_update'
  ) then
    create policy "templates_update" on public.templates
      for update to authenticated
      using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='templates' and policyname='templates_delete'
  ) then
    create policy "templates_delete" on public.templates
      for delete to authenticated
      using (true);
  end if;
end$$;

