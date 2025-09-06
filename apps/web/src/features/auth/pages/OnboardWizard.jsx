import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, listMyMemberships, createOrg, upsertOrgSettings, recordInvite } from "../services/orgs";

export default function OnboardWizard(){
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [orgId, setOrgId] = useState(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState({ brand_name: "", brand_logo_url: "" });
  const [inv1, setInv1] = useState("");
  const [inv2, setInv2] = useState("");

  useEffect(()=>{
    (async ()=>{
      try{
        const user = await getCurrentUser();
        if (!user) { nav('/login?redirect=/onboard'); return; }
        const ms = await listMyMemberships(user.id);
        if (Array.isArray(ms) && ms.length > 0){ nav('/dashboard', { replace: true }); }
      }catch(e){ /* ignore */ }
    })();
  }, [nav]);

  async function makeOrg(){
    setErr("");
    try{
      setBusy(true);
      const org = await createOrg(name.trim());
      setOrgId(org.id);
      setStep(2);
    }catch(e){ setErr(e.message || String(e)); }
    finally{ setBusy(false); }
  }

  async function saveBrand(){
    setErr("");
    try{
      setBusy(true);
      if (orgId) await upsertOrgSettings(orgId, brand);
      setStep(3);
    }catch(e){ setErr(e.message || String(e)); }
    finally{ setBusy(false); }
  }

  async function finish(){
    setErr("");
    try{
      setBusy(true);
      if (orgId){
        const emails = [inv1, inv2].map(s => (s||"").trim()).filter(Boolean);
        for (const email of emails){ await recordInvite(orgId, email, 'member'); }
      }
      nav('/dashboard', { replace: true });
    }catch(e){ setErr(e.message || String(e)); }
    finally{ setBusy(false); }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="text-xl font-semibold">Setup your workspace</div>
      {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{err}</div>}

      {step === 1 && (
        <div className="bg-white rounded-2xl border p-4 space-y-3">
          <div className="font-medium">Step 1 — Organization</div>
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Organization name</div>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={name} onChange={(e)=> setName(e.target.value)} placeholder="Autotrust, Demo Motors…"/>
          </label>
          <div className="flex items-center justify-end gap-2">
            <button className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm" onClick={makeOrg} disabled={busy || !name.trim()}>Continue</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-2xl border p-4 space-y-3">
          <div className="font-medium">Step 2 — Brand (optional)</div>
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Brand name</div>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={brand.brand_name} onChange={(e)=> setBrand(b=>({...b, brand_name:e.target.value}))} placeholder="Display brand"/>
          </label>
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Logo URL</div>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={brand.brand_logo_url} onChange={(e)=> setBrand(b=>({...b, brand_logo_url:e.target.value}))} placeholder="https://…"/>
          </label>
          <div className="flex items-center justify-between">
            <button className="px-3 py-2 rounded-lg border text-sm" onClick={()=> setStep(3)}>Skip</button>
            <button className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm" onClick={saveBrand} disabled={busy}>Continue</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-2xl border p-4 space-y-3">
          <div className="font-medium">Step 3 — Invite team (optional)</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="text-sm block">
              <div className="text-slate-600 mb-1">Member email #1</div>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" type="email" value={inv1} onChange={(e)=> setInv1(e.target.value)} placeholder="teammate1@example.com"/>
            </label>
            <label className="text-sm block">
              <div className="text-slate-600 mb-1">Member email #2</div>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" type="email" value={inv2} onChange={(e)=> setInv2(e.target.value)} placeholder="teammate2@example.com"/>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <button className="px-3 py-2 rounded-lg border text-sm" onClick={()=> nav('/dashboard', { replace:true })}>Skip</button>
            <button className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm" onClick={finish} disabled={busy}>Finish</button>
          </div>
        </div>
      )}
    </div>
  );
}

