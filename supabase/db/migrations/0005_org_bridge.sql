-- Bridge columns: add org_id to tenant-scoped tables and keep in sync via trigger

-- 1) Add org_id columns where the app expects them
alter table if exists public.leads add column if not exists org_id uuid;
alter table if exists public.lead_notes add column if not exists org_id uuid;
alter table if exists public.calendar_events add column if not exists org_id uuid;
alter table if exists public.themes add column if not exists org_id uuid;

-- 2) Backfill from tenant_id if present
update public.leads          set org_id = tenant_id where org_id is null and tenant_id is not null;
update public.lead_notes     set org_id = tenant_id where org_id is null and tenant_id is not null;
update public.calendar_events set org_id = tenant_id where org_id is null and tenant_id is not null;
update public.themes         set org_id = tenant_id where org_id is null and tenant_id is not null;

-- 3) Create a simple sync trigger to mirror values both ways on insert/update
create or replace function public.org_tenant_sync() returns trigger language plpgsql as $$
begin
  -- ensure both columns are populated if either is provided
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
  -- leads
  if not exists (select 1 from pg_trigger where tgname='trg_leads_org_sync') then
    create trigger trg_leads_org_sync before insert or update on public.leads
      for each row execute function public.org_tenant_sync();
  end if;
  -- lead_notes
  if not exists (select 1 from pg_trigger where tgname='trg_lead_notes_org_sync') then
    create trigger trg_lead_notes_org_sync before insert or update on public.lead_notes
      for each row execute function public.org_tenant_sync();
  end if;
  -- calendar_events
  if not exists (select 1 from pg_trigger where tgname='trg_calendar_events_org_sync') then
    create trigger trg_calendar_events_org_sync before insert or update on public.calendar_events
      for each row execute function public.org_tenant_sync();
  end if;
  -- themes
  if not exists (select 1 from pg_trigger where tgname='trg_themes_org_sync') then
    create trigger trg_themes_org_sync before insert or update on public.themes
      for each row execute function public.org_tenant_sync();
  end if;
end$$;

-- 4) Helpful indexes
create index if not exists ix_leads_org_id on public.leads(org_id);
create index if not exists ix_lead_notes_org_id on public.lead_notes(org_id);
create index if not exists ix_calendar_events_org_id on public.calendar_events(org_id);
create index if not exists ix_themes_org_id on public.themes(org_id);

