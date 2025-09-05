import { supabase } from "../../../lib/supabase";
import { getTenantId } from "../../../lib/tenant";

/**
 * Fetch leads for the current tenant.
 * Accepts simple params now; we’ll add more later.
 */
export async function fetchLeads({ search = "", limit = 50, offset = 0 } = {}) {
  if (!supabase) throw new Error("supabase not initialised");
  const tenantId = getTenantId();
  if (!tenantId) throw new Error("tenant_id missing");

  let q = supabase
    .from("leads")
    .select("id, name, phone, email, status, stage_id, created_at", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    // basic ilike on name/email/phone
    q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}
