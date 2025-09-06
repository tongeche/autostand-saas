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
      // Select only columns known to exist in schema.sql
      "id, org_id, plate, make, model, version, year, mileage, fuel, transmission, color, price, status, source, created_at, updated_at",
      { count: "exact" }
    )
    .eq("org_id", org_id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q && q.trim()){
    const term = q.trim();
    // match plate, make (brand), or model
    query = query.or(
      `plate.ilike.%${term}%,make.ilike.%${term}%,model.ilike.%${term}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: data || [], total: count || 0 };
}

// Update a single car by id
export async function updateCar(id, payload = {}){
  if (!id) throw new Error("Missing car id");
  const { data, error } = await supabase
    .from('cars')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Delete a single car by id
export async function deleteCar(id){
  if (!id) throw new Error("Missing car id");
  const { error } = await supabase.from('cars').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// Archive or unarchive a car (uses status field if no dedicated archived column)
export async function archiveCar(id, archived = true){
  return updateCar(id, { status: archived ? 'archived' : 'in_stock' });
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

// Upsert cars given "normalized" rows (keys like plate, brand, model, version, first_reg, km, fuel, sale_price, total_with_expenses, status)
// This maps to schema columns (make, mileage, price, year, etc) and updates existing by plate or inserts new.
export async function upsertCarsNormalized(rows = []){
  if (!supabase) throw new Error("Supabase not initialised");
  const org_id = ORG();
  if (!org_id) throw new Error("Missing org id");
  const norm = Array.isArray(rows) ? rows : [];
  const parseYear = (x) => {
    try { const y = new Date(x).getFullYear(); return Number.isFinite(y) ? y : null; } catch { return null; }
  };
  const mapStatus = (s) => {
    const t = String(s||'').toLowerCase();
    if (t.includes('archiv')) return 'archived';
    if (t.includes('low') || t.includes('baixo')) return 'low_stock';
    if (t.includes('out') || t.includes('esgot')) return 'out_of_stock';
    if (t.includes('stock') || t.includes('dispon')) return 'in_stock';
    return t || 'in_stock';
  };
  const mapped = norm
    .map(r => ({
      plate: r.plate || '',
      make: r.brand || r.make || null,
      model: r.model || null,
      version: r.version || null,
      year: r.first_reg ? parseYear(r.first_reg) : null,
      mileage: r.km != null ? Number(String(r.km).replace(/[^0-9.-]/g,'')) : null,
      fuel: r.fuel || null,
      price: r.sale_price != null && r.sale_price !== '' ? Number(String(r.sale_price).replace(/[^0-9.-]/g,''))
            : (r.total_with_expenses != null && r.total_with_expenses !== '' ? Number(String(r.total_with_expenses).replace(/[^0-9.-]/g,'')) : null),
      status: mapStatus(r.status),
    }))
    .filter(r => r.plate && r.plate.length > 0)
    .map(r => ({ ...r, org_id }));

  if (mapped.length === 0) return { inserted: 0, updated: 0 };

  // Check existing by plate for this org
  const plates = Array.from(new Set(mapped.map(r => r.plate)));
  const { data: existing, error: qErr } = await supabase
    .from('cars')
    .select('id, plate')
    .eq('org_id', org_id)
    .in('plate', plates);
  if (qErr) throw qErr;
  const byPlate = new Map((existing||[]).map(r => [r.plate, r.id]));

  const withIds = mapped.map(r => byPlate.has(r.plate) ? { ...r, id: byPlate.get(r.plate) } : r);

  // Upsert by primary key id; new rows have no id
  const { data, error } = await supabase
    .from('cars')
    .upsert(withIds, { onConflict: 'id' })
    .select('id, plate');
  if (error) throw error;

  const updated = withIds.filter(r => 'id' in r).length;
  const inserted = withIds.length - updated;
  return { inserted, updated };
}
