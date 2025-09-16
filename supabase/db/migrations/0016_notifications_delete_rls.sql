-- Allow authenticated org members to delete notifications in their org
alter table if exists public.notifications enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='notif_delete') then
    create policy notif_delete on public.notifications
      for delete to authenticated
      using (
        exists (select 1 from public.org_members m where m.org_id = notifications.org_id and m.user_id = auth.uid())
      );
  end if;
end$$;

