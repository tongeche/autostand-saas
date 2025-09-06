import { supabase } from "../../lib/supabase";
import { getTenantId } from "../../lib/tenant";

const zero = { totalLeads: 0, newLeads: 0, inventory: 0, activities7d: 0, activeLeads: 0 };

export async function fetchStats() {
  const orgId = getTenantId();
  if (!supabase) throw new Error("Supabase client not initialised (envs missing?)");
  // If no tenant yet (first login before org is selected), return zeros
  if (!orgId) return zero;

  // helper that returns 0 on failure instead of crashing the whole fetch
  async function safeCount(from, filtersFn) {
    try {
      let q = supabase.from(from).select("*", { count: "exact", head: true });
      q = filtersFn ? filtersFn(q) : q;
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    } catch (e) {
      console.warn(`[stats] ${from} count failed:`, e?.message || e);
      return 0;
    }
  }

  // 1) total leads
  const totalLeads = await safeCount("leads", (q) => q.eq("org_id", orgId));

  // 2) new leads (last 30 days) — requires leads.created_at
  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  const newLeads = await safeCount("leads", (q) =>
    q.eq("org_id", orgId).gte("created_at", since30.toISOString())
  );

  // 3) inventory items — depends on business type
  let businessType = 'cars';
  try{
    const { data: s } = await supabase
      .from('org_settings')
      .select('business_type')
      .eq('org_id', orgId)
      .maybeSingle();
    if (s?.business_type) businessType = s.business_type;
  }catch{}
  let inventory = 0;
  if (businessType === 'general'){
    // generic inventory items
    inventory = await safeCount('inventory_items', (q)=> q.eq('org_id', orgId));
  } else {
    // cars business
    inventory = await safeCount('cars', (q)=> q.eq('org_id', orgId));
  }

  // 4) activities in last 7 days — requires audit_logs.created_at
  const since7 = new Date();
  since7.setDate(since7.getDate() - 7);
  const activities7d = await safeCount("lead_activities", (q) =>
    q.eq("org_id", orgId).gte("ts", since7.toISOString())
  );

  // 5) ACTIVE LEADS (exclude closed outcomes like won/lost/archived)
  // Active leads (simple heuristic: not deleted)
  const activeLeads = await safeCount("leads", (q) => q.eq("org_id", orgId).is("deleted_at", null));

  return { totalLeads, newLeads, inventory, activities7d, activeLeads };
}
