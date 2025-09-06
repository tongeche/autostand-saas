import { supabase } from "../../../lib/supabase";
import { getTenantId } from "../../../lib/tenant";

const ORG = () => getTenantId();

// Insert many car rows into public.cars (or your schema) with tenant scoping
// Columns we are confident exist (extend safely as your schema grows)
const SAFE_COLUMNS = new Set([
  // core identifiers
  "org_id", "plate", "brand", "model", "version",
  // dates + meta
  "first_reg", "first_reg_pt", "days_in_stock", "status",
  // specs
  "cc", "hp", "km", "fuel",
  // pricing
  "expenses", "sale_price", "purchase_price", "total_with_expenses",
]);

function sanitizeRow(row, org_id){
  const out = { org_id };
  for (const [k, v] of Object.entries(row || {})){
    if (v == null || v === "") continue;
    if (SAFE_COLUMNS.has(k)) out[k] = v;
  }
  return out;
}

export async function insertCars(rows = []){
  if (!supabase) throw new Error("Supabase not initialised");
  const org_id = ORG();
  if (!org_id) throw new Error("Missing org id");
  if (!Array.isArray(rows) || rows.length === 0) return { inserted: 0 };
  let payload = rows.map(r => sanitizeRow(r, org_id));
  // Retry logic: if a column is rejected by the database, strip it and retry (max 4 unknowns)
  let attempt = 0;
  while (attempt < 4){
    const { data, error } = await supabase.from("cars").insert(payload).select();
    if (!error) return { inserted: data?.length || 0, rows: data || [] };
    const msg = String(error.message || "");
    const m = msg.match(/'([^']+)' column of 'cars'/i) || msg.match(/column\s+"?([^"]+)"?\s+does not exist/i);
    if (!m) throw error;
    const bad = m[1];
    // remove the offending key from all rows and SAFE_COLUMNS so it won't be added again
    SAFE_COLUMNS.delete(bad);
    payload = payload.map(r => { const { [bad]:_, ...rest } = r; return rest; });
    attempt++;
  }
  // If still failing, throw original error
  throw new Error("Could not import CSV — please verify cars schema columns match the mapped fields.");
}

// List cars for tenant with optional simple search
export async function listCars({ q = "", limit = 50, offset = 0 } = {}){
  if (!supabase) throw new Error("Supabase not initialised");
  const org_id = ORG();
  if (!org_id) throw new Error("Missing org id");
  let query = supabase
    .from("cars")
    .select(
      // Keep selection conservative to avoid unknown column errors.
      "id, plate, brand, model, version, first_reg, first_reg_pt, days_in_stock, status, cc, hp, km, fuel, expenses, sale_price, purchase_price, total_with_expenses, created_at",
      { count: "exact" }
    )
    .eq("org_id", org_id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q && q.trim()){
    const term = q.trim();
    query = query.or(
      `plate.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: data || [], total: count || 0 };
}

// List rows from the staging table with exact CSV headers
export async function listCarsStaging({ limit = 500, offset = 0 } = {}){
  if (!supabase) throw new Error("Supabase not initialised");
  const org_id = ORG();
  let q = supabase
    .from('cars_import_staging')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1);
  if (org_id) q = q.eq('org_id', org_id);
  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: data || [], total: count || 0 };
}

// Get unique list of plates (Matrícula) from staging
export async function listStagingPlates(){
  const { data, error } = await supabase
    .from('cars_import_staging')
    .select('Matrícula');
  if (error) throw error;
  const plates = Array.from(new Set((data || []).map(r => r['Matrícula']).filter(Boolean)));
  return plates.sort();
}

// Insert raw CSV rows into the exact-header staging table `cars_import_staging`
// headers: array of header strings from the CSV (must match DB columns exactly)
// rows: array of string arrays (CSV data rows)
export async function insertCarsCsvStaging(headers = [], rows = [], source = 'csv-import'){
  if (!supabase) throw new Error("Supabase not initialised");
  if (!Array.isArray(headers) || headers.length === 0) throw new Error("CSV missing headers");
  if (!Array.isArray(rows) || rows.length === 0) return { inserted: 0 };
  const org_id = ORG();
  const payload = rows.map(r => {
    const obj = { source, org_id };
    headers.forEach((h, i) => { obj[h] = r[i] ?? null; });
    return obj;
  });
  const { data, error } = await supabase
    .from('cars_import_staging')
    .insert(payload)
    .select();
  if (error) throw error;
  return { inserted: data?.length || 0 };
}
