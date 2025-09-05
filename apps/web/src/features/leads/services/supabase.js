import { supabase } from "../../../lib/supabase";
import { getTenantId } from "../../../lib/tenant";

const TID = () => getTenantId();

export async function addNote(leadId, body) {
  if (!supabase) throw new Error("Supabase not initialised");
  const { data, error } = await supabase
    .from("lead_notes")
    .insert([{ tenant_id: TID(), lead_id: leadId, body }])
    .select()
    .single();
  if (error) throw error;
  await logActivity(leadId, "note", { preview: body.slice(0, 120) });
  return data;
}

export async function addTask(leadId, title, { due_date=null, priority="normal" } = {}) {
  const { data, error } = await supabase
    .from("lead_tasks")
    .insert([{ tenant_id: TID(), lead_id: leadId, title, due_date, priority }])
    .select()
    .single();
  if (error) throw error;
  await logActivity(leadId, "task_create", { title });
  return data;
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
    tenant_id: TID(),
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
    .from("lead_tasks")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw error;
  await logActivity(data.lead_id, "task_done", { taskId });
  return data;
}

// New: CRUD helpers tailored for lead_tasks with tenant scoping
export async function createLeadTask(leadId, { title, due_date = null, priority = "normal", assignee_id = null } = {}) {
  const base = { tenant_id: TID(), lead_id: leadId, title, due_date, priority };
  const payload = { ...base };
  if (assignee_id) payload.assignee_id = assignee_id;
  const { data, error } = await supabase
    .from("lead_tasks")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  await logActivity(leadId, "task_create", { title, due_date, priority });
  return data;
}

export async function updateLeadTask(taskId, patch) {
  const { data, error } = await supabase
    .from("lead_tasks")
    .update(patch)
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleLeadTaskDone(taskId, nextDone) {
  if (nextDone) {
    return completeTask(taskId);
  }
  const { data, error } = await supabase
    .from("lead_tasks")
    .update({ status: "open", completed_at: null })
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLeadTask(taskId) {
  const { error } = await supabase
    .from("lead_tasks")
    .delete()
    .eq("id", taskId);
  if (error) throw error;
  return true;
}

// List tenant tasks across all leads
export async function listTenantLeadTasks({ q = "", status = "all", onlyOpen = false, overdue = false, limit = 25, offset = 0 } = {}) {
  let query = supabase
    .from("lead_tasks")
    .select("id, lead_id, title, status, due_date, priority, assignee_id, created_at, updated_at", { count: "exact" })
    .eq("tenant_id", TID())
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q && q.trim()) query = query.ilike("title", `%${q.trim()}%`);
  if (status && status !== "all") query = query.eq("status", status);
  if (onlyOpen) query = query.neq("status", "done");
  if (overdue) {
    const today = new Date().toISOString().slice(0,10);
    query = query.neq("status", "done").lt("due_date", today);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: data || [], total: count || 0 };
}

// Recent activity across tenant (lead_activity)
export async function listTenantActivity({ limit = 10 } = {}){
  const { data, error } = await supabase
    .from("lead_activity")
    .select("id,lead_id,type,payload,created_at")
    .eq("tenant_id", TID())
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// Upcoming tasks across tenant
export async function listUpcomingTasksTenant({ limit = 5 } = {}){
  const today = new Date().toISOString().slice(0,10);
  const { data, error } = await supabase
    .from("lead_tasks")
    .select("id,lead_id,title,status,due_date,priority,assignee_id,created_at")
    .eq("tenant_id", TID())
    .neq("status", "done")
    .order("due_date", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function updateLead(leadId, patch) {
  const { data, error } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", leadId)
    .eq("tenant_id", TID())
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
  const { error } = await supabase.from("leads").delete().eq("id", leadId).eq("tenant_id", TID());
  if (error) throw error;
  await logActivity(leadId, "delete", {});
  return true;
}

export async function logContact(leadId, type, { direction="outbound", payload={} } = {}) {
  // type: 'call' | 'sms' | 'email'
  return logActivity(leadId, type, { direction, ...payload });
}

export async function logActivity(leadId, type, payload={}) {
  await supabase.from("lead_activity").insert([{ tenant_id: TID(), lead_id: leadId, type, payload }]);
}

export async function fetchLeadActivity(leadId, { limit=25 } = {}) {
  const { data, error } = await supabase
    .from("lead_activity")
    .select("id,type,payload,created_at")
    .eq("tenant_id", TID())
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function fetchLeadTasks(leadId, { onlyOpen = false, overdue = false } = {}) {
  let query = supabase
    .from("lead_tasks")
    .select("*")
    .eq("tenant_id", TID())
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (onlyOpen) query = query.neq("status", "done");
  if (overdue) {
    const today = new Date().toISOString().slice(0,10);
    query = query.neq("status", "done").lt("due_date", today);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchLeadNotes(leadId) {
  const { data, error } = await supabase
    .from("lead_notes")
    .select("*")
    .eq("tenant_id", TID())
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
