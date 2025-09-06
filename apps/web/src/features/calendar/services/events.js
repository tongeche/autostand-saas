import { supabase } from "../../../lib/supabase";
import { getTenantId } from "../../../lib/tenant";

const ORG = () => getTenantId();

export async function insertEvent({ lead_id, title, start_at, kind='task', reminder_minutes=15 }){
  if (!supabase) throw new Error('Supabase not initialised');
  const { data, error } = await supabase
    .from('calendar_events')
    .insert([{ org_id: ORG(), lead_id, title, start_at: new Date(start_at).toISOString(), kind, reminder_minutes }])
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
    .select('id, lead_id, title, start_at, kind, reminder_minutes')
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
