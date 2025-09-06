-- Bridge org_id for inventory_items so the web app can filter by org_id

-- 1) Add org_id
alter table if exists public.inventory_items add column if not exists org_id uuid;

-- 2) Backfill from tenant_id
update public.inventory_items set org_id = tenant_id where org_id is null and tenant_id is not null;

-- 3) Keep org_id <-> tenant_id in sync via trigger
create or replace function public.org_tenant_sync_inventory() returns trigger language plpgsql as $$
begin
  if TG_OP in ('INSERT','UPDATE') then
    if NEW.org_id is null and NEW.tenant_id is not null then
      NEW.org_id := NEW.tenant_id;
    end if;
    if NEW.tenant_id is null and NEW.org_id is not null then
      NEW.tenant_id := NEW.org_id;
    end if;
  end if;
  return NEW;
end$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname='trg_inventory_items_org_sync') then
    create trigger trg_inventory_items_org_sync
      before insert or update on public.inventory_items
      for each row execute function public.org_tenant_sync_inventory();
  end if;
end$$;

-- 4) Index
create index if not exists ix_inventory_items_org_id on public.inventory_items(org_id);

