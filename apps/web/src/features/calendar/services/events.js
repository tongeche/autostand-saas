import { supabase } from "../../../lib/supabase";
import { getTenantId } from "../../../lib/tenant";

const ORG = () => getTenantId();

export async function insertEvent({ lead_id, title, start_at, kind='task', reminder_minutes=15, note=null }){
  if (!supabase) throw new Error('Supabase not initialised');
  const { data, error } = await supabase
    .from('calendar_events')
    .insert([{ org_id: ORG(), lead_id, title, start_at: new Date(start_at).toISOString(), kind, reminder_minutes, note }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listEventsBetween({ from, to, limit=500 }){
  if (!supabase) throw new Error('Supabase not initialised');
  const eqTenant = ORG();
  let q = supabase
    .from('calendar_events')
    .select('id, lead_id, title, start_at, kind, reminder_minutes, note')
    .gte('start_at', new Date(from).toISOString())
    .lte('start_at', new Date(to).toISOString())
    .order('start_at', { ascending: true })
    .limit(limit);
  if (eqTenant) q = q.eq('org_id', eqTenant);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function updateEventStart(id, start_at){
  if (!supabase) throw new Error('Supabase not initialised');
  const { data, error } = await supabase
    .from('calendar_events')
    .update({ start_at: new Date(start_at).toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEvent(id, { title, kind, start_at, reminder_minutes, note }){
  if (!supabase) throw new Error('Supabase not initialised');
  const payload = {};
  if (title !== undefined) payload.title = title;
  if (kind !== undefined) payload.kind = kind;
  if (start_at !== undefined) payload.start_at = new Date(start_at).toISOString();
  if (reminder_minutes !== undefined) payload.reminder_minutes = reminder_minutes;
  if (note !== undefined) payload.note = note;
  const { data, error } = await supabase
    .from('calendar_events')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEvent(id){
  if (!supabase) throw new Error('Supabase not initialised');
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}
