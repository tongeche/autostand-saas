import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Guard: never crash render if envs are missing
export const supabase = (url && key) ? createClient(url, key) : null;

export async function updateLead(leadId, patch) {
    const { data, error } = await supabase
      .from("leads")
      .update(patch)
      .eq("id", leadId)
      .eq("tenant_id", getTenantId())
      .select()
      .single();
    if (error) throw error;
    await logActivity(leadId, "edit", { patch });
    return data;
  }
  