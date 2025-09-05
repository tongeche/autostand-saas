import { supabase } from "../../../lib/supabase";

/** Basic CRUD for public.tasks (id, lead_id, title, done, due, created_at, updated_at) */
export async function listTasks({ q = "", onlyOpen = false, overdue = false, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from("tasks")
    .select("id, lead_id, title, done, due, created_at, updated_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (onlyOpen) query = query.eq("done", false);
  if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
  if (overdue) query = query.eq("done", false).lt("due", new Date().toISOString());

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: data || [], total: count || 0 };
}

export async function listTasksByLead(leadId) {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, lead_id, title, done, due, created_at, updated_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createTask(leadId, { title, due = null } = {}) {
  const payload = { lead_id: leadId, title, due, done: false };
  const { data, error } = await supabase
    .from("tasks")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(taskId, patch) {
  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleDone(taskId, nextDone) {
  return updateTask(taskId, { done: !!nextDone, updated_at: new Date().toISOString() });
}

export async function deleteTask(taskId) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
  return true;
}
