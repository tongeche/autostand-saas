import React, { useEffect, useState } from "react";
import { FiX, FiSave } from "react-icons/fi";
import { createLead } from "../services/supabase";
import { listStagingPlates } from "../../inventory/services/cars";

export default function AddLeadWizard({ open, onClose, onCreated }){
  const [form, setForm] = useState({ name:"", phone:"", email:"", source:"", plate:"" });
  const [plates, setPlates] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(()=>{
    if (!open) return;
    setForm({ name:"", phone:"", email:"", source:"", plate:"" });
    // load plates from staging to attach a car
    (async ()=>{
      try { const p = await listStagingPlates(); setPlates(p || []); }
      catch { setPlates([]); }
    })();
  }, [open]);

  if (!open) return null;

  const save = async () => {
    if (!form.name.trim()) return alert("Please enter a name");
    try {
      setBusy(true);
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        source: form.source.trim() || null,
        plate: form.plate.trim() || null,
        status: 'new',
        archived: false,
      };
      const rec = await createLead(payload);
      try { window.dispatchEvent(new CustomEvent('autostand:lead:created', { detail: { lead: rec } })); } catch {}
      onCreated?.(rec);
      onClose?.();
    } catch (e) {
      alert(e?.message || 'Failed to create lead');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/30 flex items-start justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-medium">Add Lead</div>
          <button className="p-2 rounded border" onClick={onClose}><FiX/></button>
        </div>
        <div className="p-4 space-y-3">
          <Field label="Name">
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.name} onChange={(e)=> setForm(f=>({...f,name:e.target.value}))} placeholder="John Doe"/>
          </Field>
          <Field label="Phone">
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.phone} onChange={(e)=> setForm(f=>({...f,phone:e.target.value}))} placeholder="+351 …"/>
          </Field>
          <Field label="Email">
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.email} onChange={(e)=> setForm(f=>({...f,email:e.target.value}))} placeholder="john@example.com"/>
          </Field>
          <Field label="Source">
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.source} onChange={(e)=> setForm(f=>({...f,source:e.target.value}))} placeholder="https://…"/>
          </Field>
          <Field label="Plate">
            {plates && plates.length > 0 ? (
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={form.plate}
                onChange={(e)=> setForm(f=>({...f, plate: e.target.value}))}
              >
                <option value="">Select plate…</option>
                {plates.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : (
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.plate} onChange={(e)=> setForm(f=>({...f,plate:e.target.value}))} placeholder="AA-00-AA"/>
            )}
          </Field>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button className="px-3 py-2 border rounded" onClick={onClose}>Cancel</button>
            <button className="px-3 py-2 rounded bg-gray-900 text-white inline-flex items-center gap-2" onClick={save} disabled={busy || !form.name.trim()}>
              <FiSave/> Save Lead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }){
  return (
    <label className="text-sm block">
      <div className="text-slate-600 mb-1">{label}</div>
      {children}
    </label>
  );
}
