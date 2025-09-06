-- Bring public.tasks in sync with the web app expectations
-- Expected columns by web app:
--   id uuid default gen_random_uuid(), org_id uuid, lead_id uuid, title text,
--   done boolean default false, due_at timestamptz, priority text default 'normal',
--   assignee_id uuid, created_at timestamptz default now(), updated_at timestamptz default now()

-- 1) Columns and defaults
alter table public.tasks
  alter column id set default gen_random_uuid();

alter table public.tasks
  add column if not exists org_id uuid,
  add column if not exists due_at timestamptz,
  add column if not exists priority text default 'normal',
  add column if not exists assignee_id uuid;

-- 2) Backfill due_at from legacy column `due` if present
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'due'
  ) then
    execute 'update public.tasks set due_at = coalesce(due_at, due)';
  end if;
end$$;

-- 3) Optional: drop legacy `due` column if present (keeps schema clean)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'due'
  ) then
    execute 'alter table public.tasks drop column due';
  end if;
end$$;

-- 4) Touch updated_at automatically on updates
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_tasks_updated'
  ) then
    create trigger trg_tasks_updated
      before update on public.tasks
      for each row execute function public.set_updated_at();
  end if;
end$$;

-- 5) RLS policy for dev (mirrors other dev_* policies)
alter table public.tasks enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='dev_all_tasks'
  ) then
    create policy "dev_all_tasks" on public.tasks using (true) with check (true);
  end if;
end$$;

-- 6) Helpful index
create index if not exists ix_tasks_org_id on public.tasks(org_id);

