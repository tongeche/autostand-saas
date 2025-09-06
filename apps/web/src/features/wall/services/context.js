import { supabase } from "../../../lib/supabase";
import { getTenantId } from "../../../lib/tenant";

// Resolve a dot path like "lead.name" against an object
export function resolvePath(obj, path){
  try{
    return path.split('.').reduce((o,k)=> (o==null ? undefined : o[k]), obj);
  }catch{ return undefined; }
}

// Build a document context from a lead id (and optional overrides)
export async function assembleDocContext({ leadId, orgId = getTenantId(), userId = null } = {}){
  if (!supabase) throw new Error('Supabase not initialised');
  const ctx = {};

  // Current user (owner)
  try{
    const { data: userData } = await supabase.auth.getUser();
    const uid = userId || userData?.user?.id || null;
    if (uid){
      const { data: p } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', uid)
        .maybeSingle();
      ctx.owner = { id: uid, name: p?.full_name || userData?.user?.email || 'Owner', avatar_url: p?.avatar_url || '' };
      // Alias for templates using {{agent.*}}
      ctx.agent = { ...ctx.owner };
    }
  }catch{}

  // Org
  try{
    if (orgId){
      const { data: orgRow } = await supabase.from('orgs').select('id,name').eq('id', orgId).maybeSingle();
      const { data: settings } = await supabase.from('org_settings').select('brand_name').eq('org_id', orgId).maybeSingle();
      ctx.org = { id: orgId, name: settings?.brand_name || orgRow?.name || 'Organization' };
      // Alias for templates using {{stand.*}}
      ctx.stand = { ...ctx.org };
    }
  }catch{}

  // Lead
  let lead = null;
  try{
    if (leadId){
      const { data } = await supabase
        .from('leads')
        .select('id,name,email,phone,plate,meta')
        .eq('id', leadId)
        .maybeSingle();
      lead = data || null;
      if (lead){
        ctx.lead = { id: lead.id, name: lead.name || '', email: lead.email || '', phone: lead.phone || '', plate: lead.plate || '' };
        // Alias for templates using {{client.*}}
        ctx.client = { name: ctx.lead.name, email: ctx.lead.email, phone: ctx.lead.phone, plate: ctx.lead.plate };
      }
    }
  }catch{}

  // Car (match by plate in cars table; fallback to cars_import_staging)
  try{
    const plate = lead?.plate || null;
    if (plate && orgId){
      const { data: car } = await supabase
        .from('cars')
        .select('id, make, model, version, year, mileage, fuel, color, price, source')
        .eq('org_id', orgId)
        .eq('plate', plate)
        .maybeSingle();
      if (car){
        ctx.car = {
          id: car.id,
          brand: car.make || '', make: car.make || '', model: car.model || '', version: car.version || '',
          year: car.year || '', mileage: car.mileage || '', fuel: car.fuel || '', color: car.color || '',
          price: car.price || '', extras: car.source || '', plate
        };
      } else {
        // Fallback to staging (exact-header Portuguese columns)
        const { data: s } = await supabase
          .from('cars_import_staging')
          .select('
            "Matrícula",
            "Marca",
            "Modelo",
            "Versão",
            "KM",
            "Combustível",
            "Preço de Venda",
            "Cor",
            "Data da primeira matrícula"
          ')
          .eq('org_id', orgId)
          .eq('Matrícula', plate)
          .maybeSingle();
        if (s){
          // Try to parse year from first registration date
          let year = '';
          const firstReg = s['Data da primeira matrícula'] || '';
          try { year = new Date(firstReg).getFullYear() || ''; } catch {}
          ctx.car = {
            brand: s['Marca'] || '', make: s['Marca'] || '', model: s['Modelo'] || '', version: s['Versão'] || '',
            year,
            mileage: s['KM'] || '',
            fuel: s['Combustível'] || '',
            color: s['Cor'] || '',
            price: s['Preço de Venda'] || '',
            extras: s['Versão'] || '',
            plate
          };
        }
      }
    }
  }catch{}

  // Assets (gallery items by lead)
  try{
    if (leadId){
      const { data: imgs } = await supabase
        .from('gallery_items')
        .select('id,title,image_url,meta')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(12);
      ctx.assets = (imgs || []).map(g => ({ id: g.id, title: g.title || '', url: g.image_url || '', meta: g.meta || {} }));
    }
  }catch{}

  return ctx;
}
