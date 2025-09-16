-- RLS policies for lead_activities (org-scoped)
alter table if exists public.lead_activities enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lead_activities' and policyname='la_select') then
    create policy la_select on public.lead_activities
      for select to authenticated
      using (
        exists (
          select 1 from public.org_members m
           where m.org_id = lead_activities.org_id and m.user_id = auth.uid()
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lead_activities' and policyname='la_insert') then
    create policy la_insert on public.lead_activities
      for insert to authenticated
      with check (
        exists (
          select 1 from public.org_members m
           where m.org_id = lead_activities.org_id and m.user_id = auth.uid()
        )
      );
  end if;
end$$;

