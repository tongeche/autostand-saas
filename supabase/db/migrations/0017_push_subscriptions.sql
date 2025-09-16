-- Push subscriptions table (for Web Push)
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null,
  org_id uuid not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists ix_push_subs_user on public.push_subscriptions(user_id);
create index if not exists ix_push_subs_org on public.push_subscriptions(org_id);

alter table public.push_subscriptions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='push_subscriptions' and policyname='ps_insert') then
    create policy ps_insert on public.push_subscriptions
      for insert to authenticated
      with check (
        user_id = auth.uid() and exists (
          select 1 from public.org_members m where m.org_id = push_subscriptions.org_id and m.user_id = auth.uid()
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='push_subscriptions' and policyname='ps_select') then
    create policy ps_select on public.push_subscriptions
      for select to authenticated
      using (
        user_id = auth.uid() and exists (
          select 1 from public.org_members m where m.org_id = push_subscriptions.org_id and m.user_id = auth.uid()
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='push_subscriptions' and policyname='ps_delete') then
    create policy ps_delete on public.push_subscriptions
      for delete to authenticated
      using (
        user_id = auth.uid()
      );
  end if;
end$$;

