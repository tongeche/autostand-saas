-- Bridge org_id for cars_import_staging to match web app queries

-- 1) Add org_id column if missing
alter table if exists public.cars_import_staging add column if not exists org_id uuid;

-- 2) Backfill from tenant_id
update public.cars_import_staging set org_id = tenant_id where org_id is null and tenant_id is not null;

-- 3) Keep org_id <-> tenant_id in sync via trigger
create or replace function public.org_tenant_sync_cis() returns trigger language plpgsql as $$
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
  if not exists (select 1 from pg_trigger where tgname='trg_cis_org_sync') then
    create trigger trg_cis_org_sync before insert or update on public.cars_import_staging
      for each row execute function public.org_tenant_sync_cis();
  end if;
end$$;

-- 4) Helpful index
create index if not exists ix_cis_org_id on public.cars_import_staging(org_id);

