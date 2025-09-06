import { supabase } from "../../../lib/supabase";
import { getTenantId } from "../../../lib/tenant";

export async function listDeliverable({ onlyUnread = true, limit = 20 } = {}){
  const org = getTenantId();
  if (!org) return [];
  let q = supabase
    .from('notifications')
    .select('id, kind, title, body, ref, deliver_at, read')
    .eq('org_id', org)
    .lte('deliver_at', new Date().toISOString())
    .order('deliver_at', { ascending: false })
    .limit(limit);
  if (onlyUnread) q = q.eq('read', false);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function markRead(id){
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

