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

export async function fetchLeadTasks(leadId) {
  const { data, error } = await supabase
    .from("lead_tasks")
    .select("*")
    .eq("tenant_id", TID())
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
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
