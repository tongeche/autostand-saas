import React, { useEffect, useState } from "react";
import { FiX, FiSave } from "react-icons/fi";
import { createLead } from "../services/supabase";
import { listCars } from "../../inventory/services/cars";

const SOURCE_OPTIONS = [
  { value:'whatsapp', label:'WhatsApp' },
  { value:'stand_virtual', label:'Stand Virtual' },
  { value:'piscapisca', label:'PiscaPisca' },
  { value:'website', label:'Website' },
  { value:'facebook', label:'Facebook' },
  { value:'instagram', label:'Instagram' },
  { value:'other', label:'Other' },
];

export default function AddLeadWizard({ open, onClose, onCreated }){
  const [form, setForm] = useState({ name:"", phone:"", source:"", source_url:"", plate:"", carId:null });
  const [cars, setCars] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(()=>{
    if (!open) return;
    setForm({ name:"", phone:"", source:"", source_url:"", plate:"", carId:null });
    // load cars from inventory to link a car
    (async ()=>{
      try { const { rows } = await listCars({ limit: 100 }); setCars(rows || []); }
      catch { setCars([]); }
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
        source: form.source.trim() || null,
        plate: form.plate.trim() || null,
        meta: {
          ...(form.carId ? { car_id: form.carId } : {}),
          ...(form.source_url?.trim() ? { source_url: form.source_url.trim() } : {}),
        },
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Field label="Source">
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={form.source}
                onChange={(e)=> setForm(f=>({...f,source:e.target.value}))}
              >
                <option value="">Select…</option>
                {SOURCE_OPTIONS.map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="URL" >
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.source_url}
                onChange={(e)=> setForm(f=>({...f,source_url:e.target.value}))}
                placeholder="https://…"
              />
            </Field>
            <div className="hidden sm:block"></div>
          </div>
          <Field label="Car">
            {cars && cars.length > 0 ? (
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={form.carId || ''}
                onChange={(e)=>{
                  const id = e.target.value || null;
                  const car = (cars||[]).find(c=> String(c.id) === String(id));
                  setForm(f=>({...f, carId: id, plate: car?.plate || '' }));
                }}
              >
                <option value="">Select car…</option>
                {cars.map(c => (
                  <option key={c.id} value={c.id}>{labelForCar(c)}</option>
                ))}
              </select>
            ) : (
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.plate} onChange={(e)=> setForm(f=>({...f,plate:e.target.value}))} placeholder="Type plate (no cars yet)"/>
            )}
            {form.carId && (
              <div className="mt-1 text-xs text-slate-600">Selected plate: <span className="font-medium">{form.plate}</span></div>
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

function labelForCar(c){
  const name = [c.make, c.model, c.version].filter(Boolean).join(' ');
  return `${name || 'Car'} → ${c.plate || '—'}`;
}
