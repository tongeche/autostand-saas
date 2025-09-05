-- (core schema)  SEE: leads, activities, tasks, wall, inventory, templates, messages,
-- financing, trade-ins, org settings, user prefs, device prefs, views, indexes
-- === SNIP: FULL CORE FILE BELOW ===
create table if not exists orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  locale text default 'pt-PT',
  currency text default 'EUR',
  created_at timestamptz not null default now()
);
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, avatar_url text,
  created_at timestamptz not null default now()
);
create table if not exists org_members (
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','sales','pre_sales','post_sales','viewer')),
  joined_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create table if not exists pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  position int not null,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text check (source in ('standvirtual','whatsapp','web','phone','walkin','facebook','instagram','other')),
  intent text,
  name text, email text, phone text, nationality text,
  current_owner_user_id uuid references auth.users(id),
  stage_id uuid references pipeline_stages(id),
  last_contacted_at timestamptz,
  last_activity_at timestamptz,
  car_id uuid, car_plate text, car_make text, car_model text, car_version text, car_status text,
  tags text[] default '{}',
  order_index bigint,
  deleted_at timestamptz
);
create index if not exists idx_leads_org_stage_order on leads (org_id, stage_id, order_index);
create index if not exists idx_leads_org_created on leads (org_id, created_at desc);
create index if not exists idx_leads_org_plate on leads (org_id, car_plate);
create index if not exists idx_leads_org_phone_email on leads (org_id, phone, email);
create table if not exists lead_car_interest (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  car_id uuid,
  plate text,
  is_primary boolean default false,
  created_at timestamptz not null default now()
);
create table if not exists lead_activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  ts timestamptz not null default now(),
  type text not null check (type in ('contact','info_prepared','pdf_generated','task_created','status_change','note','message')),
  actor_user_id uuid references auth.users(id),
  channel text,
  data jsonb not null default '{}'::jsonb
);
create index if not exists idx_lead_activities_lead_ts on lead_activities (lead_id, ts desc);
create index if not exists idx_lead_activities_org_ts on lead_activities (org_id, ts desc);
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  due_at timestamptz,
  done boolean not null default false,
  lead_id uuid references leads(id) on delete set null,
  owner_user_id uuid references auth.users(id),
  priority text check (priority in ('low','normal','high')) default 'normal',
  meta jsonb not null default '{}'::jsonb
);
create index if not exists idx_tasks_org_due on tasks (org_id, due_at);
create index if not exists idx_tasks_owner_due on tasks (owner_user_id, due_at);
create table if not exists wall_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  x int not null, y int not null, color text not null default 'yellow',
  z_index int default 0, content text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists wall_views (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  zoom numeric not null default 1.0, pan_x int not null default 0, pan_y int not null default 0,
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create table if not exists cars (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  plate text, make text, model text, version text, year int, mileage int,
  fuel text, transmission text, color text, price numeric, status text, source text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists idx_cars_org_plate on cars (org_id, plate);
create index if not exists idx_cars_org_status on cars (org_id, status);
create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  car_id uuid references cars(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  kind text not null check (kind in ('car_photo','doc','pdf','misc')),
  path text not null, mime text, meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  title text not null,
  channel text not null check (channel in ('email','whatsapp','standvirtual','pdf')),
  language text default 'pt-PT',
  body text not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  channel text not null check (channel in ('email','whatsapp','standvirtual')),
  direction text not null check (direction in ('outbound','inbound')),
  status text not null check (status in ('draft','queued','sent','delivered','failed')),
  template_id uuid references templates(id),
  subject text, body text, meta jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_lead_time on messages (lead_id, created_at desc);
create table if not exists financing_apps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  car_id uuid references cars(id),
  status text not null check (status in ('new','docs_requested','submitted','approved','rejected','cancelled')),
  requested_amount numeric, term_months int, bank text,
  docs_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists trade_ins (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  plate text, make text, model text, year int, mileage int,
  estimated_value numeric, status text default 'assessing',
  created_at timestamptz not null default now()
);
create table if not exists org_settings (
  org_id uuid primary key references orgs(id) on delete cascade,
  theme_mode text not null default 'system' check (theme_mode in ('light','dark','system')),
  brand_name text, brand_logo_url text, timezone text default 'Europe/Lisbon',
  date_format text default 'dd/MM/yyyy', pipeline_locked boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists user_preferences (
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  theme_mode text default 'system' check (theme_mode in ('light','dark','system')),
  density text default 'comfortable' check (density in ('compact','comfortable')),
  locale text, mobile_nav_pinned boolean default true,
  updated_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create table if not exists user_devices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_label text, last_seen_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);
create table if not exists user_device_prefs (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references user_devices(id) on delete cascade,
  nav_collapsed boolean, wall_zoom numeric, extra jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create or replace view lead_metrics as
select l.org_id, l.id as lead_id,
  max(a.ts) filter (where a.type in ('contact','message')) as last_contacted_at,
  max(a.ts) as last_activity_at, count(a.*) as activity_count
from leads l left join lead_activities a on a.lead_id = l.id
group by l.org_id, l.id;
create or replace view funnel_counts as
select org_id, stage_id, count(*) as leads_count
from leads where deleted_at is null group by org_id, stage_id;
