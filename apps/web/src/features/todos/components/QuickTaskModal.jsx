import React, { useEffect, useState } from "react";
import { FiX, FiSave } from "react-icons/fi";
import { supabase } from "../../../lib/supabase";
import { getTenantId } from "../../../lib/tenant";
import { createLeadTask } from "../../leads/services/supabase";
import { formatShortDate } from "./shared";

export default function QuickTaskModal({ open, onClose, onCreated, defaultTitle = "", defaultDue = null }){
  const [leads, setLeads] = useState([]);
  const [leadId, setLeadId] = useState("");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(()=>{
    if (!open) return;
    (async ()=>{
      const { data, error } = await supabase
        .from("leads")
        .select("id,name,plate,created_at")
        .eq("tenant_id", getTenantId())
        .order("created_at", { ascending:false })
        .limit(50);
      if (!error) setLeads(data||[]);
      if (data && data[0]) setLeadId(data[0].id);
      const d = defaultDue ? new Date(defaultDue) : (function(){ const x=new Date(); x.setDate(x.getDate()+1); return x; })();
      setDue(toLocal(d));
      setTitle(defaultTitle || "");
    })();
  }, [open, defaultTitle, defaultDue]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75] bg-black/30 flex items-start justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="font-medium">New Task</div>
          <button className="p-2 rounded border" onClick={onClose}><FiX/></button>
        </div>
        <div className="p-4 space-y-3">
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Lead</div>
            <select className="w-full rounded-lg border px-3 py-2 text-sm bg-white" value={leadId} onChange={(e)=> setLeadId(e.target.value)}>
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.name || l.plate || l.id}</option>
              ))}
            </select>
          </label>
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Title</div>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={title} onChange={(e)=> setTitle(e.target.value)} placeholder="e.g., Call back, send photos"/>
          </label>
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Due date</div>
            <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={due} onChange={(e)=> setDue(e.target.value)} />
          </label>
          <div className="flex items-center justify-end gap-2">
            <button className="px-3 py-2 border rounded" onClick={onClose}>Cancel</button>
            <button className="px-3 py-2 rounded bg-gray-900 text-white inline-flex items-center gap-2"
              onClick={async ()=>{
                if (!leadId || !title.trim()) return;
                try{
                  setBusy(true);
                  const task = await createLeadTask(leadId, { title: title.trim(), due_date: due || null });
                  try { window.dispatchEvent(new CustomEvent('autostand:lead_task:created', { detail: { task } })); } catch{}
                  onCreated?.(task);
                  onClose?.();
                } catch(e){
                  alert(e?.message || 'Failed to create task');
                } finally { setBusy(false); }
              }} disabled={busy || !leadId || !title.trim()}>
              <FiSave/> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function toLocal(d){
  try { return new Date(d).toISOString().slice(0,10); } catch { return ''; }
}
