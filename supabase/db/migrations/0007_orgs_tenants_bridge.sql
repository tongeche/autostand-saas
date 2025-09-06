-- Ensure every org has a corresponding tenant row with the same id

-- 1) Backfill tenants from existing orgs (idempotent)
insert into public.tenants (id, name)
select o.id, coalesce(o.name, 'Org '||substr(o.id::text,1,8))
from public.orgs o
left join public.tenants t on t.id = o.id
where t.id is null;

-- 2) Trigger to mirror new orgs into tenants
create or replace function public.orgs_to_tenants_sync() returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    -- create tenant row if missing, with same id
    insert into public.tenants(id, name)
    values (NEW.id, coalesce(NEW.name, 'Org '||substr(NEW.id::text,1,8)))
    on conflict (id) do nothing;
  elsif TG_OP = 'UPDATE' then
    -- keep tenant name in sync (optional)
    update public.tenants set name = coalesce(NEW.name, name)
    where id = NEW.id;
  end if;
  return NEW;
end$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname='trg_orgs_to_tenants_sync') then
    create trigger trg_orgs_to_tenants_sync
      after insert or update on public.orgs
      for each row execute function public.orgs_to_tenants_sync();
  end if;
end$$;

