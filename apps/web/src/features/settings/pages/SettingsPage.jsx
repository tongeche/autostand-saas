import React, { useEffect, useState } from "react";
import { getCandidateBases, getFunctionsBase, detectFunctionsBase } from "../../../lib/functionsBase";
import { supabase } from "../../../lib/supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const DEFAULT_FUNCTIONS_BASE = '/.netlify/functions';

export default function SettingsPage(){
  const [orgId, setOrgId] = useState(null);
  const [brand, setBrand] = useState({ brand_name: "", brand_logo_url: "", theme_mode: "system", timezone: "", date_format: "", business_type: 'cars' });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  // Push-related UI (kept separate to avoid touching your existing msg/busy)
  const [pushMsg, setPushMsg] = useState("");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushCount, setPushCount] = useState(0);
  const [fnBase, setFnBase] = useState(getFunctionsBase());
  const [fnOk, setFnOk] = useState(null); // null | true | false
  const [fnHint, setFnHint] = useState("");

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
        // load existing device subs count
        try{
          const { count } = await supabase
            .from('push_subscriptions')
            .select('*', { count:'exact', head:true })
            .eq('user_id', uid)
            .eq('org_id', id);
          setPushCount(count || 0);
        }catch{}
      }catch(e){ setMsg(e.message || String(e)); }
    })();
  }, []);

  // Auto-detect best functions base among candidates and show hint
  useEffect(()=>{
    let cancelled = false;
    (async ()=>{
      const selected = await detectFunctionsBase();
      if (cancelled) return;
      setFnBase(selected);
      // Validate once more for message
      try{
        const res = await fetch(`${selected}/push-send`, { method: 'OPTIONS' });
        if (res.ok || res.status === 204){ setFnOk(true); setFnHint(`Connected via ${selected}`); }
        else { setFnOk(false); setFnHint(`Functions not reachable at ${selected} (status ${res.status}).`); }
      }catch{ setFnOk(false); setFnHint(`Functions not reachable at ${selected}.`); }
    })();
    return ()=> { cancelled = true; };
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

  // --- Push enable (non-invasive; uses its own state) ---
  async function enablePushOnThisDevice(){
    try{
      setPushBusy(true);
      setPushMsg("");

      // 0) sanity checks
      if (!orgId) throw new Error("No org selected");
      const { data: userWrap, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userWrap?.user?.id;
      if (!userId) throw new Error("No active user session");
      if (!VAPID_PUBLIC_KEY) throw new Error("Missing VITE_VAPID_PUBLIC_KEY");

      // 1) browser capabilities
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Push not supported on this browser/device");
      }

      // 2) ask permission (must be triggered by a user gesture)
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Notification permission denied");

      // 3) register service worker (expects /public/sw.js in your app)
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

      // 4) subscribe with VAPID public key
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY)
      });

      // 5) persist to Supabase (user+org scoped)
      const payload = {
        user_id: userId,
        org_id: orgId,
        endpoint: sub.endpoint,
        p256dh: keyToB64(sub.getKey("p256dh")),
        auth:   keyToB64(sub.getKey("auth")),
      };
      const { error } = await supabase.from("push_subscriptions").upsert(payload, { onConflict: "endpoint" });
      if (error) throw error;

      try{ const { count } = await supabase.from('push_subscriptions').select('*', { count:'exact', head:true }).eq('user_id', userId).eq('org_id', orgId); setPushCount(count||0); }catch{}
      setPushMsg("✅ Push enabled on this device.");
    }catch(e){
      setPushMsg(`❌ ${e?.message || String(e)}`);
    }finally{
      setPushBusy(false);
    }
  }
async function disablePushOnThisDevice(){
  try{
    setPushBusy(true); setPushMsg("");
    const { data: u } = await supabase.auth.getUser();
    const userId = u?.user?.id; if (!userId || !orgId) throw new Error('Missing user/org');
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub){ await sub.unsubscribe(); }
    // delete server record by endpoint
    if (sub?.endpoint){ await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint).eq('user_id', userId); }
    try{ const { count } = await supabase.from('push_subscriptions').select('*', { count:'exact', head:true }).eq('user_id', userId).eq('org_id', orgId); setPushCount(count||0); }catch{}
    setPushMsg('✅ Push disabled on this device.');
  }catch(e){ setPushMsg(`❌ ${e?.message || String(e)}`); }
  finally{ setPushBusy(false); }
}

async function sendTestPush(){
  try{
    setPushMsg("Sending…");
    const { data: u } = await supabase.auth.getUser();
    const userId = u?.user?.id;
    if (!userId || !orgId) throw new Error("Missing user/org");

    const res = await fetch(`${fnBase}/push-send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        org_id: orgId,
        payload: { title: "Test push", body: "Hello from Settings", data: { url: "/tasks" } }
      })
    });

    // Try JSON, fallback to text to surface Netlify error pages/helpful messages
    let msgBody = {};
    try { msgBody = await res.json(); }
    catch {
      try { const txt = await res.text(); msgBody = { raw: (txt || '').slice(0, 300) }; }
      catch { msgBody = {}; }
    }
    setPushMsg(`Response: ${res.status} ${JSON.stringify(msgBody)}`);
  } catch(e){
    setPushMsg(`❌ ${e?.message || String(e)}`);
  }
}



  // helpers (self-contained; no impact on existing code)
  function base64UrlToUint8Array(b64){
    const padding = "=".repeat((4 - (b64.length % 4)) % 4);
    const base64 = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function keyToB64(key){
    const bytes = new Uint8Array(key || []);
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
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

        {/* --- Push notifications section (isolated) --- */}
        <div className="pt-4 mt-4 border-t">
      <div className="font-medium">Notifications</div>
      <p className="text-sm text-slate-600">Enable browser push alerts for tasks on this device.</p>
      <div className="text-xs text-slate-600 flex items-center gap-2">
        <span>Functions:</span>
        {fnOk === null ? (
          <span>checking…</span>
        ) : fnOk ? (
          <span className="text-emerald-700">OK — {fnHint}</span>
        ) : (
          <span className="text-amber-700">{fnHint}</span>
        )}
      </div>
      <div className="text-[11px] text-slate-500 mt-1">Trying bases: {getCandidateBases().join(', ')}</div>
          <div className="text-xs text-slate-600">Registered devices for your account in this org: <span className="font-medium">{pushCount}</span></div>
          <div className="flex items-center flex-wrap gap-2 mt-2">
            <button
              onClick={enablePushOnThisDevice}
              className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50 disabled:opacity-50"
              disabled={pushBusy || !orgId}
              title={!orgId ? "No organization selected" : "Enable push notifications on this device"}
            >
              {pushBusy ? "Enabling…" : "Enable push notifications"}
            </button>
            <button
              onClick={disablePushOnThisDevice}
              className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50 disabled:opacity-50"
              disabled={pushBusy || !orgId}
              title={!orgId ? "No organization selected" : "Disable push on this device"}
            >
              Disable on this device
            </button>
            {pushMsg && <span className="text-sm">{pushMsg}</span>}
          </div>
        </div>
        {/* --- end push section --- */}

        <button
  onClick={sendTestPush}
  className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50 disabled:opacity-50"
  disabled={pushBusy || !orgId}
>
  Send test notification
</button>


      </div>
    </div>
  );
}
