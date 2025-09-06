-- Notifications and reminder upserts for tasks and calendar events

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  user_id uuid,
  kind text not null,
  title text not null,
  body text,
  ref jsonb not null default '{}',
  deliver_at timestamptz not null default now(),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ix_notifications_org_deliver on public.notifications(org_id, deliver_at);
create index if not exists ix_notifications_read on public.notifications(read);

alter table public.notifications enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='notif_select') then
    create policy notif_select on public.notifications
      for select to authenticated
      using (
        exists (select 1 from public.org_members m where m.org_id = notifications.org_id and m.user_id = auth.uid())
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='notif_update') then
    create policy notif_update on public.notifications
      for update to authenticated
      using (
        exists (select 1 from public.org_members m where m.org_id = notifications.org_id and m.user_id = auth.uid())
      ) with check (
        exists (select 1 from public.org_members m where m.org_id = notifications.org_id and m.user_id = auth.uid())
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='notif_insert') then
    create policy notif_insert on public.notifications
      for insert to authenticated
      with check (
        exists (select 1 from public.org_members m where m.org_id = notifications.org_id and m.user_id = auth.uid())
      );
  end if;
end$$;

-- Helper: upsert task reminder notification
create or replace function public.upsert_task_reminder() returns trigger language plpgsql as $$
declare
  remind_at timestamptz;
  existing_id uuid;
  j jsonb;
begin
  if NEW.due_at is null or NEW.done is true then
    return NEW;
  end if;
  remind_at := NEW.due_at - interval '15 minutes';
  if remind_at < now() then
    remind_at := NEW.due_at; -- at least notify at due time
  end if;
  j := jsonb_build_object('task_id', NEW.id::text);
  select id into existing_id from public.notifications
    where org_id = NEW.org_id and kind = 'task_reminder' and (ref->>'task_id') = NEW.id::text
    limit 1;
  if existing_id is null then
    insert into public.notifications(org_id, user_id, kind, title, body, ref, deliver_at)
      values (NEW.org_id, NEW.assignee_id, 'task_reminder', coalesce(NEW.title,'Task due soon'), '', j, remind_at);
  else
    update public.notifications set user_id = NEW.assignee_id, title = coalesce(NEW.title,'Task due soon'), deliver_at = remind_at, read = false where id = existing_id;
  end if;
  return NEW;
end$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname='trg_task_reminder') then
    create trigger trg_task_reminder after insert or update of due_at, done, assignee_id, title on public.tasks
      for each row execute function public.upsert_task_reminder();
  end if;
end$$;

-- Helper: upsert calendar event reminder notification
create or replace function public.upsert_event_reminder() returns trigger language plpgsql as $$
declare
  remind_at timestamptz;
  existing_id uuid;
  j jsonb;
begin
  if NEW.start_at is null then return NEW; end if;
  remind_at := NEW.start_at - make_interval(mins => coalesce(NEW.reminder_minutes, 15));
  if remind_at < now() then remind_at := NEW.start_at; end if;
  j := jsonb_build_object('event_id', NEW.id::text);
  select id into existing_id from public.notifications
    where org_id = NEW.tenant_id and kind = 'event_reminder' and (ref->>'event_id') = NEW.id::text
    limit 1;
  if existing_id is null then
    insert into public.notifications(org_id, user_id, kind, title, body, ref, deliver_at)
      values (NEW.tenant_id, null, 'event_reminder', coalesce(NEW.title,'Event'), '', j, remind_at);
  else
    update public.notifications set title = coalesce(NEW.title,'Event'), deliver_at = remind_at, read = false where id = existing_id;
  end if;
  return NEW;
end$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname='trg_event_reminder') then
    create trigger trg_event_reminder after insert or update of start_at, reminder_minutes, title on public.calendar_events
      for each row execute function public.upsert_event_reminder();
  end if;
end$$;

