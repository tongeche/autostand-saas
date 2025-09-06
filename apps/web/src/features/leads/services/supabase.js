import { supabase } from "../../../lib/supabase";
import { getTenantId } from "../../../lib/tenant";

const ORG = () => getTenantId();

function mapTaskRow(r){
  if (!r) return r;
  return {
    ...r,
    // adapter fields expected by UI
    status: r.done ? 'done' : 'open',
    due_date: r.due_at ?? null,
  };
}
function mapTasks(rows){ return Array.isArray(rows) ? rows.map(mapTaskRow) : []; }
function mapActivityRow(r){
  if (!r) return r;
  return { ...r, created_at: r.ts, payload: r.data };
}
function mapActivities(rows){ return Array.isArray(rows) ? rows.map(mapActivityRow) : []; }
function coerceDueAt(d){
  if (!d) return null;
  try { return new Date(d).toISOString(); } catch { return null; }
}
// Allowed activity types in DB: contact, info_prepared, pdf_generated, task_created, status_change, note, message
function adaptActivityType(t){
  const x = String(t || '').toLowerCase();
  if (x === 'task_create' || x === 'task_created') return 'task_created';
  if (x === 'task_done') return 'status_change';
  if (['contact','info_prepared','pdf_generated','status_change','note','message','call','sms','email'].includes(x)) return x === 'call' || x === 'sms' || x === 'email' ? 'contact' : x;
  if (x === 'create' || x === 'edit' || x === 'archive' || x === 'delete') return 'note';
  return 'note';
}

export async function addNote(leadId, body) {
  if (!supabase) throw new Error("Supabase not initialised");
  const { data, error } = await supabase
    .from("lead_notes")
    .insert([{ org_id: ORG(), lead_id: leadId, body }])
    .select()
    .single();
  if (error) throw error;
  await logActivity(leadId, "note", { preview: body.slice(0, 120) });
  return data;
}

export async function addTask(leadId, title, { due_date=null, priority="normal" } = {}) {
  const { data, error } = await supabase
    .from("tasks")
    .insert([{ org_id: ORG(), lead_id: leadId, title, due_at: coerceDueAt(due_date), priority }])
    .select()
    .single();
  if (error) throw error;
  await logActivity(leadId, "task_created", { title });
  return mapTaskRow(data);
}

function makeUuid(){
  try { if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID(); } catch {}
  // RFC4122 v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function createLead(payload){
  const base = {
    id: payload.id || makeUuid(),
    name: payload.name,
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    source: payload.source ?? null,
    plate: payload.plate ?? null,
    status: payload.status || 'new',
    archived: payload.archived ?? false,
    org_id: ORG(),
  };
  const { data, error } = await supabase
    .from('leads')
    .insert([base])
    .select()
    .single();
  if (error) throw error;
  await logActivity(data.id, 'create', { name: base.name });
  return data;
}

export async function completeTask(taskId) {
  const { data, error } = await supabase
    .from("tasks")
    .update({ done: true })
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw error;
  await logActivity(data.lead_id, "task_done", { taskId });
  return mapTaskRow(data);
}

// New: CRUD helpers tailored for tasks with org scoping
export async function createLeadTask(leadId, { title, due_date = null, priority = "normal", assignee_id = null } = {}) {
  const base = { org_id: ORG(), lead_id: leadId, title, due_at: coerceDueAt(due_date), priority };
  const payload = { ...base };
  if (assignee_id) payload.assignee_id = assignee_id;
  const { data, error } = await supabase
    .from("tasks")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  await logActivity(leadId, "task_created", { title, due_date, priority });
  return mapTaskRow(data);
}

export async function updateLeadTask(taskId, patch) {
  const payload = { ...patch };
  if (Object.prototype.hasOwnProperty.call(payload, 'status')){
    // bridge: update boolean done
    payload.done = payload.status === 'done';
    delete payload.status;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'due_date')){
    payload.due_at = coerceDueAt(payload.due_date);
    delete payload.due_date;
  }
  const { data, error } = await supabase
    .from("tasks")
    .update(payload)
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw error;
  return mapTaskRow(data);
}

export async function toggleLeadTaskDone(taskId, nextDone) {
  if (nextDone) {
    return completeTask(taskId);
  }
  const { data, error } = await supabase
    .from("tasks")
    .update({ done: false })
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw error;
  return mapTaskRow(data);
}

export async function deleteLeadTask(taskId) {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);
  if (error) throw error;
  return true;
}

// List tenant tasks across all leads
export async function listTenantLeadTasks({ q = "", status = "all", onlyOpen = false, overdue = false, limit = 25, offset = 0 } = {}) {
  let query = supabase
    .from("tasks")
    .select("id, lead_id, title, done, due_at, priority, assignee_id, created_at, updated_at", { count: "exact" })
    .eq("org_id", ORG())
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q && q.trim()) query = query.ilike("title", `%${q.trim()}%`);
  if (status && status !== "all") query = query.eq("done", status === 'done');
  if (onlyOpen) query = query.eq("done", false);
  if (overdue) {
    const nowIso = new Date().toISOString();
    query = query.eq("done", false).lt("due_at", nowIso);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: mapTasks(data || []), total: count || 0 };
}

// Recent activity across tenant (lead_activities)
export async function listTenantActivity({ limit = 10 } = {}){
  const { data, error } = await supabase
    .from("lead_activities")
    .select("id,lead_id,type,data,ts")
    .eq("org_id", ORG())
    .order("ts", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return mapActivities(data || []);
}

// Upcoming tasks across tenant
export async function listUpcomingTasksTenant({ limit = 5 } = {}){
  const { data, error } = await supabase
    .from("tasks")
    .select("id,lead_id,title,done,due_at,priority,assignee_id,created_at")
    .eq("org_id", ORG())
    .eq("done", false)
    .order("due_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw error;
  return mapTasks(data || []);
}

export async function updateLead(leadId, patch) {
  const { data, error } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", leadId)
    .eq("org_id", ORG())
    .select()
    .single();
  if (error) throw error;
  await logActivity(leadId, "edit", { patch });
  return data;
}

export async function changeStatus(leadId, status) {
  const rec = await updateLead(leadId, { status });
  await logActivity(leadId, "status_change", { status });
  return rec;
}

export async function changeStage(leadId, stage_id) {
  const rec = await updateLead(leadId, { stage_id });
  await logActivity(leadId, "stage_change", { stage_id });
  return rec;
}

export async function archiveLead(leadId, archived=true) {
  const rec = await updateLead(leadId, { archived });
  await logActivity(leadId, archived ? "archive" : "edit", { archived });
  return rec;
}

export async function deleteLead(leadId) {
  // Hard delete (dev). Use archive in prod flows.
  const { error } = await supabase.from("leads").delete().eq("id", leadId).eq("org_id", ORG());
  if (error) throw error;
  await logActivity(leadId, "delete", {});
  return true;
}

export async function logContact(leadId, type, { direction="outbound", payload={} } = {}) {
  // type: 'call' | 'sms' | 'email'
  return logActivity(leadId, type, { direction, ...payload });
}

export async function logActivity(leadId, type, payload={}) {
  await supabase.from("lead_activities").insert([{ org_id: ORG(), lead_id: leadId, type: adaptActivityType(type), data: payload }]);
}

export async function fetchLeadActivity(leadId, { limit=25 } = {}) {
  const { data, error } = await supabase
    .from("lead_activities")
    .select("id,type,data,ts")
    .eq("org_id", ORG())
    .eq("lead_id", leadId)
    .order("ts", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return mapActivities(data || []);
}

export async function fetchLeadTasks(leadId, { onlyOpen = false, overdue = false } = {}) {
  let query = supabase
    .from("tasks")
    .select("id, lead_id, title, done, due_at, priority, assignee_id, created_at, updated_at")
    .eq("org_id", ORG())
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (onlyOpen) query = query.eq("done", false);
  if (overdue) {
    const nowIso = new Date().toISOString();
    query = query.eq("done", false).lt("due_at", nowIso);
  }
  const { data, error } = await query;
  if (error) throw error;
  return mapTasks(data || []);
}

export async function fetchLeadNotes(leadId) {
  const { data, error } = await supabase
    .from("lead_notes")
    .select("*")
    .eq("org_id", ORG())
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
