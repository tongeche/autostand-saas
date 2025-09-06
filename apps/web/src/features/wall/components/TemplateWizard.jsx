import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function TemplateWizard({ open, onClose, onCreated }){
  const [name, setName] = useState("");
  const [category, setCategory] = useState("sales");
  const [subject, setSubject] = useState("");
  const [channel, setChannel] = useState("email");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(()=>{ if (open){ setName(""); setCategory("sales"); setSubject(""); setChannel("email"); setBody(""); setErr(""); setBusy(false);} }, [open]);

  if (!open) return null;

  async function save(closeAfter=true){
    setErr("");
    try{
      if (!supabase) throw new Error("Supabase not configured");
      if (!name.trim()) throw new Error("Template name is required");
      setBusy(true);
      const id = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
      const row = { id, name: name.trim(), category, channel, subject: subject || null, body: body || "" };
      const { data, error } = await supabase.from('templates').insert([row]).select().single();
      if (error) throw error;
      onCreated?.(data);
      if (closeAfter) onClose?.(); else { setName(""); setSubject(""); setBody(""); }
    }catch(e){ setErr(e.message || String(e)); }
    finally{ setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[95] bg-black/30 flex items-start justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom:'1px solid #e5e7eb' }}>
          <div className="font-medium">Create Template</div>
          <button className="p-2 rounded border" onClick={onClose}>×</button>
        </div>
        <div className="p-4 space-y-3">
          {err && <div className="text-sm text-red-700 bg-red-50 rounded p-2">{err}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm block">
              <div className="text-slate-600 mb-1">Name</div>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={name} onChange={(e)=> setName(e.target.value)} placeholder="e.g., Vehicle Proposal"/>
            </label>
            <label className="text-sm block">
              <div className="text-slate-600 mb-1">Category</div>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={category} onChange={(e)=> setCategory(e.target.value)}>
                <option value="sales">Sales</option>
                <option value="leads">Leads</option>
                <option value="communication">Communication</option>
                <option value="checklist">Checklist</option>
              </select>
            </label>
            <label className="text-sm block">
              <div className="text-slate-600 mb-1">Channel</div>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={channel} onChange={(e)=> setChannel(e.target.value)}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="pdf">PDF</option>
              </select>
            </label>
            <label className="text-sm block">
              <div className="text-slate-600 mb-1">Subject (optional)</div>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={subject} onChange={(e)=> setSubject(e.target.value)} placeholder="Subject for email/pdf"/>
            </label>
          </div>
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Body</div>
            <textarea className="w-full rounded-lg border px-3 py-2 text-sm min-h-[220px]" value={body} onChange={(e)=> setBody(e.target.value)} placeholder="Supports placeholders like {{client.name}}, {{car.plate}}"/>
          </label>
          <div className="flex items-center justify-end gap-2">
            <button className="px-3 py-2 rounded-xl bg-gray-200 text-gray-800 text-sm" onClick={onClose}>Close</button>
            <button className="px-3 py-2 rounded-xl text-white text-sm font-medium" style={{ background:'#3C6B5B' }} onClick={()=> save(false)} disabled={busy}>Save & add another</button>
            <button className="px-3 py-2 rounded-xl text-white text-sm font-medium" style={{ background:'#3C6B5B' }} onClick={()=> save(true)} disabled={busy}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

