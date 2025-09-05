-- Leads
create table if not exists leads (
  id uuid primary key,
  created_at timestamptz not null default now(),
  name text,
  email text,
  phone text,
  source text,
  status text not null default 'New',
  owner_role text,
  owner_name text,
  car_id uuid,
  car_plate text,
  car_make text,
  car_model text,
  car_version text,
  order_index bigint
);

-- Activities
create table if not exists lead_activities (
  id uuid primary key,
  lead_id uuid not null references leads(id) on delete cascade,
  ts timestamptz not null default now(),
  type text not null,
  actor text,
  data jsonb not null default '{}'
);
create index if not exists idx_activities_lead_ts on lead_activities(lead_id, ts desc);

-- Tasks
create table if not exists tasks (
  id uuid primary key,
  title text not null,
  due timestamptz,
  done boolean not null default false,
  lead_id uuid references leads(id) on delete set null,
  lead_name text,
  lead_plate text,
  owner text
);

-- Inventory (simplified)
create table if not exists cars (
  id uuid primary key,
  plate text unique,
  make text,
  model text,
  version text,
  year int,
  mileage int,
  fuel text,
  transmission text,
  color text,
  price numeric,
  status text
);

-- Templates
create table if not exists templates (
  id uuid primary key,
  title text not null,
  channel text not null, -- email|whatsapp|standvirtual
  body text not null
);
