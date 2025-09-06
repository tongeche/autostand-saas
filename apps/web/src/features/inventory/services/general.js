import { supabase } from "../../../lib/supabase";
import { getTenantId } from "../../../lib/tenant";

export async function listGeneralItems({ q = "", limit = 100, offset = 0 } = {}){
  const tenant_id = getTenantId();
  if (!tenant_id) return { rows: [], total: 0 };
  let query = supabase
    .from('inventory_items')
    .select('id, name, sku, quantity, price, status, category, created_at', { count: 'exact' })
    .eq('tenant_id', tenant_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (q && q.trim()) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: data || [], total: count || 0 };
}

