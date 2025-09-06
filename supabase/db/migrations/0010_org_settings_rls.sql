-- RLS policies for org_settings so members of an org can upsert

alter table if exists public.org_settings enable row level security;

do $$
begin
  -- SELECT policy
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='org_settings' and policyname='org_settings_select'
  ) then
    create policy "org_settings_select" on public.org_settings
      for select to authenticated
      using (
        exists (
          select 1 from public.org_members m
          where m.org_id = org_settings.org_id and m.user_id = auth.uid()
        )
      );
  end if;

  -- INSERT policy (in case "upsert" hits an insert path)
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='org_settings' and policyname='org_settings_insert'
  ) then
    create policy "org_settings_insert" on public.org_settings
      for insert to authenticated
      with check (
        exists (
          select 1 from public.org_members m
          where m.org_id = org_settings.org_id and m.user_id = auth.uid()
        )
      );
  end if;

  -- UPDATE policy
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='org_settings' and policyname='org_settings_update'
  ) then
    create policy "org_settings_update" on public.org_settings
      for update to authenticated
      using (
        exists (
          select 1 from public.org_members m
          where m.org_id = org_settings.org_id and m.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.org_members m
          where m.org_id = org_settings.org_id and m.user_id = auth.uid()
        )
      );
  end if;
end$$;

