import { supabase } from "../../../lib/supabase";

export async function getCurrentUser(){
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data?.user || null;
}

export async function listMyMemberships(userId){
  if (!userId) return [];
  const { data, error } = await supabase
    .from('org_members')
    .select('org_id, role, orgs(name, slug)')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

// Create an org and auto-add the creator as owner via SECURITY DEFINER RPC
// Expects a Postgres function:
//   create or replace function public.create_org_owner(_name text) returns uuid ...
export async function createOrg(name){
  const { data, error } = await supabase.rpc('create_org_owner', { _name: name });
  if (error) throw error;
  return { id: data };
}

export async function upsertOrgSettings(orgId, { brand_name=null, brand_logo_url=null } = {}){
  const payload = { org_id: orgId, brand_name, brand_logo_url };
  const { data, error } = await supabase
    .from('org_settings')
    .upsert(payload, { onConflict: 'org_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function recordInvite(orgId, email, role='member'){
  // Use app_users as a lightweight invite registry
  const row = { id: crypto.randomUUID(), tenant_id: orgId, email, role };
  const { data, error } = await supabase
    .from('app_users')
    .insert([row])
    .select()
    .single();
  if (error) throw error;
  return data;
}
