-- (RLS + policies)  org-scoped access
alter table orgs              enable row level security;
alter table profiles          enable row level security;
alter table org_members       enable row level security;
alter table pipeline_stages   enable row level security;
alter table leads             enable row level security;
alter table lead_activities   enable row level security;
alter table tasks             enable row level security;
alter table wall_notes        enable row level security;
alter table wall_views        enable row level security;
alter table cars              enable row level security;
alter table media             enable row level security;
alter table templates         enable row level security;
alter table messages          enable row level security;
alter table financing_apps    enable row level security;
alter table trade_ins         enable row level security;
alter table org_settings      enable row level security;
alter table user_preferences  enable row level security;
alter table user_devices      enable row level security;
alter table user_device_prefs enable row level security;

create or replace view me_orgs as
select m.org_id from org_members m where m.user_id = auth.uid();

create policy "orgs_select_member" on orgs for select using (id in (select org_id from me_orgs));
create policy "org_members_select_member" on org_members for select using (org_id in (select org_id from me_orgs));

create policy "stages_rw_member" on pipeline_stages for select using (org_id in (select org_id from me_orgs));
create policy "stages_insert_member" on pipeline_stages for insert with check (org_id in (select org_id from me_orgs));
create policy "stages_update_member" on pipeline_stages for update using (org_id in (select org_id from me_orgs)) with check (org_id in (select org_id from me_orgs));

create policy "leads_select_member" on leads for select using (org_id in (select org_id from me_orgs));
create policy "leads_insert_member" on leads for insert with check (org_id in (select org_id from me_orgs));
create policy "leads_update_member" on leads for update using (org_id in (select org_id from me_orgs)) with check (org_id in (select org_id from me_orgs));

create policy "acts_select_member" on lead_activities for select using (org_id in (select org_id from me_orgs));
create policy "acts_insert_member" on lead_activities for insert with check (org_id in (select org_id from me_orgs));

create policy "tasks_select_member" on tasks for select using (org_id in (select org_id from me_orgs));
create policy "tasks_cud_member"    on tasks for all    using (org_id in (select org_id from me_orgs)) with check (org_id in (select org_id from me_orgs));

create policy "wall_notes_cud_member" on wall_notes for all using (org_id in (select org_id from me_orgs)) with check (org_id in (select org_id from me_orgs));
create policy "wall_views_cud_member" on wall_views for all using (org_id in (select org_id from me_orgs)) with check (org_id in (select org_id from me_orgs));

create policy "cars_cud_member"  on cars  for all using (org_id in (select org_id from me_orgs)) with check (org_id in (select org_id from me_orgs));
create policy "media_cud_member" on media for all using (org_id in (select org_id from me_orgs)) with check (org_id in (select org_id from me_orgs));

create policy "templates_cud_member" on templates for all using (org_id in (select org_id from me_orgs)) with check (org_id in (select org_id from me_orgs));
create policy "messages_cud_member"  on messages  for all using (org_id in (select org_id from me_orgs)) with check (org_id in (select org_id from me_orgs));

create policy "fin_cud_member" on financing_apps for all using (org_id in (select org_id from me_orgs)) with check (org_id in (select org_id from me_orgs));
create policy "tradeins_cud_member" on trade_ins for all using (org_id in (select org_id from me_orgs)) with check (org_id in (select org_id from me_orgs));

create policy "org_settings_cud_member" on org_settings for all using (org_id in (select org_id from me_orgs)) with check (org_id in (select org_id from me_orgs));

create policy "user_prefs_select_member" on user_preferences for select using (org_id in (select org_id from me_orgs));
create policy "user_prefs_cud_self" on user_preferences
for all using (org_id in (select org_id from me_orgs) and user_id = auth.uid())
with check (org_id in (select org_id from me_orgs) and user_id = auth.uid());

create policy "devices_select_member" on user_devices
for select using (org_id in (select org_id from me_orgs) and user_id = auth.uid());
create policy "devices_cud_self" on user_devices
for all using (org_id in (select org_id from me_orgs) and user_id = auth.uid())
with check (org_id in (select org_id from me_orgs) and user_id = auth.uid());

create policy "device_prefs_cud" on user_device_prefs
for all using (exists (select 1 from user_devices d where d.id = device_id and d.user_id = auth.uid()));
