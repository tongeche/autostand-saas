import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function SettingsPage(){
  const [orgId, setOrgId] = useState(null);
  const [brand, setBrand] = useState({ brand_name: "", brand_logo_url: "", theme_mode: "system", timezone: "", date_format: "", business_type: 'cars' });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  useEffect(()=>{
    (async ()=>{
      try{
        setMsg("");
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id; if (!uid) return;
        const { data: ms } = await supabase
          .from('org_members')
          .select('org_id, orgs(name)')
          .eq('user_id', uid)
          .order('joined_at', { ascending:true })
          .limit(1);
        if (!ms || !ms[0]){ setMsg('No organization found for your account'); return; }
        const id = ms[0].org_id; setOrgId(id);
        const { data: s } = await supabase
          .from('org_settings')
          .select('brand_name, brand_logo_url, theme_mode, timezone, date_format, business_type')
          .eq('org_id', id)
          .maybeSingle();
        if (s) setBrand({
          brand_name: s.brand_name || '',
          brand_logo_url: s.brand_logo_url || '',
          theme_mode: s.theme_mode || 'system',
          timezone: s.timezone || '',
          date_format: s.date_format || '',
          business_type: s.business_type || 'cars'
        });
      }catch(e){ setMsg(e.message || String(e)); }
    })();
  }, []);

  async function save(){
    try{
      setBusy(true); setMsg("");
      const payload = {
        org_id: orgId,
        brand_name: brand.brand_name || null,
        brand_logo_url: brand.brand_logo_url || null,
        theme_mode: brand.theme_mode || null,
        timezone: brand.timezone || null,
        date_format: brand.date_format || null,
        business_type: brand.business_type || null
      };
      const { error } = await supabase.from('org_settings').upsert(payload, { onConflict: 'org_id' });
      if (error) throw error;
      setMsg('Saved');
    }catch(e){ setMsg(e.message || String(e)); }
    finally{ setBusy(false); }
  }

  async function uploadLogo(file){
    if (!file || !orgId) return;
    try{
      setUploadBusy(true); setMsg("");
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${orgId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('org-logos').upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('org-logos').getPublicUrl(path);
      const url = pub?.publicUrl || '';
      setBrand(b => ({ ...b, brand_logo_url: url }));
      setMsg('Uploaded logo');
    }catch(e){ setMsg(e.message || String(e)); }
    finally{ setUploadBusy(false); }
  }

  return (
    <div className="max-w-2xl space-y-3">
      <div className="text-xl font-semibold">Settings</div>
      {msg && <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded p-2">{msg}</div>}
      <div className="bg-white rounded-2xl border p-4 space-y-3">
        <div className="font-medium">Brand</div>
        <label className="text-sm block">
          <div className="text-slate-600 mb-1">Brand name</div>
          <input className="w-full rounded-lg border px-3 py-2 text-sm" value={brand.brand_name} onChange={(e)=> setBrand(b=>({...b, brand_name:e.target.value}))} />
        </label>
        <label className="text-sm block">
          <div className="text-slate-600 mb-1">Logo URL</div>
          <input className="w-full rounded-lg border px-3 py-2 text-sm" value={brand.brand_logo_url} onChange={(e)=> setBrand(b=>({...b, brand_logo_url:e.target.value}))} placeholder="https://…" />
        </label>
        <div className="flex items-center gap-2">
          <input type="file" accept="image/*" onChange={(e)=> uploadLogo(e.target.files?.[0] || null)} disabled={uploadBusy || !orgId} />
          {brand.brand_logo_url && (
            <img src={brand.brand_logo_url} alt="logo" className="h-10 w-auto rounded"/>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Business type</div>
            <select className="w-full rounded-lg border px-3 py-2 text-sm" value={brand.business_type} onChange={(e)=> setBrand(b=>({...b, business_type:e.target.value}))}>
              <option value="cars">Cars (vehicle inventory)</option>
              <option value="general">Other (generic inventory)</option>
            </select>
          </label>
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Theme</div>
            <select className="w-full rounded-lg border px-3 py-2 text-sm" value={brand.theme_mode} onChange={(e)=> setBrand(b=>({...b, theme_mode:e.target.value}))}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Timezone</div>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Europe/Lisbon" value={brand.timezone} onChange={(e)=> setBrand(b=>({...b, timezone:e.target.value}))} />
          </label>
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Date format</div>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="YYYY-MM-DD" value={brand.date_format} onChange={(e)=> setBrand(b=>({...b, date_format:e.target.value}))} />
          </label>
        </div>
        <div className="flex items-center justify-end">
          <button className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm" onClick={save} disabled={busy || !orgId}>Save changes</button>
        </div>
      </div>
    </div>
  );
}
