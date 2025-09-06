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
    }
  }catch{}

  // Org
  try{
    if (orgId){
      const { data: orgRow } = await supabase.from('orgs').select('id,name').eq('id', orgId).maybeSingle();
      const { data: settings } = await supabase.from('org_settings').select('brand_name').eq('org_id', orgId).maybeSingle();
      ctx.org = { id: orgId, name: settings?.brand_name || orgRow?.name || 'Organization' };
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
      if (lead){ ctx.lead = { id: lead.id, name: lead.name || '', email: lead.email || '', phone: lead.phone || '', plate: lead.plate || '' }; }
    }
  }catch{}

  // Car (match by plate in cars table if available)
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
          id: car.id, brand: car.make || '', model: car.model || '', version: car.version || '',
          year: car.year || '', mileage: car.mileage || '', fuel: car.fuel || '', color: car.color || '',
          price: car.price || '', extras: car.source || ''
        };
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

