-- Add optional note/description to calendar events
alter table if exists public.calendar_events
  add column if not exists note text;

-- No RLS policy change needed; existing CRUD policies apply.

