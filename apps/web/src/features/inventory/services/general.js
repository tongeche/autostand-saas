import { supabase } from "../../../lib/supabase";
import { getTenantId } from "../../../lib/tenant";

export async function listGeneralItems({ q = "", limit = 100, offset = 0 } = {}){
  const org_id = getTenantId();
  if (!org_id) return { rows: [], total: 0 };
  let query = supabase
    .from('inventory_items')
    .select('id, name, sku, quantity, price, status, category, created_at', { count: 'exact' })
    .eq('org_id', org_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (q && q.trim()) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: data || [], total: count || 0 };
}

// Import general items from a simple CSV: headers [name, sku, quantity, price, status, category]
export async function upsertGeneralItemsFromCsv(headers = [], rows = []){
  const org_id = getTenantId();
  if (!org_id) throw new Error('Missing org id');
  if (!Array.isArray(headers) || headers.length === 0) throw new Error('CSV missing headers');
  if (!Array.isArray(rows) || rows.length === 0) return { inserted: 0 };

  // Map header names case-insensitively
  const H = {};
  headers.forEach((h, i) => { H[h.trim().toLowerCase()] = i; });
  const idx = (labelArr) => {
    for (const label of labelArr){
      const i = H[label]; if (i != null) return i;
    }
    return -1;
  };
  const iName = idx(['name','item','product']);
  const iSku  = idx(['sku']);
  const iQty  = idx(['quantity','qty']);
  const iPrice= idx(['price','amount']);
  const iStat = idx(['status']);
  const iCat  = idx(['category','cat']);

  const num = (x) => { const n = Number(String(x||'').replace(/[^0-9.-]/g,'')); return isNaN(n) ? 0 : n; };

  const payload = rows.map(r => ({
    org_id,
    name: iName>=0 ? (r[iName]||'').toString() : '',
    sku:  iSku>=0 ? (r[iSku]||'').toString() : null,
    quantity: iQty>=0 ? num(r[iQty]) : 0,
    price: iPrice>=0 ? num(r[iPrice]) : null,
    status: iStat>=0 ? (r[iStat]||'').toString() : null,
    category: iCat>=0 ? (r[iCat]||'').toString() : null,
  })).filter(x => x.name);

  if (payload.length === 0) return { inserted: 0 };

  const { data, error } = await supabase.from('inventory_items').insert(payload).select('id');
  if (error) throw error;
  return { inserted: data?.length || 0 };
}
