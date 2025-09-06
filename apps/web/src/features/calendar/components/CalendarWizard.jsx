import React, { useEffect, useMemo, useState } from "react";
import { FiX, FiSave } from "react-icons/fi";
import { supabase } from "../../../lib/supabase";
import { getTenantId } from "../../../lib/tenant";
import { createLeadTask } from "../../leads/services/supabase";
import { insertEvent } from "../services/events";

export default function CalendarWizard({ open, onClose, onCreated, initialType='task', initialDate=null, initialTime=null }){
  const [type, setType] = useState(initialType); // task | schedule | reminder
  const [leads, setLeads] = useState([]);
  const [leadId, setLeadId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [busy, setBusy] = useState(false);

  useEffect(()=>{
    if (!open) return;
    (async ()=>{
      const { data } = await supabase
        .from('leads')
        .select('id,name,plate,created_at')
        .eq('org_id', getTenantId())
        .order('created_at', { ascending:false })
        .limit(50);
      setLeads(data||[]);
      if (data && data[0]) setLeadId(data[0].id);
      const d = initialDate ? new Date(initialDate) : new Date(); d.setMinutes(0,0,0);
      setDate(toDateInput(d)); setTime(initialTime || toTimeInput(d));
      setType(initialType || 'task');
      setTitle(suggestTitle(initialType));
    })();
  }, [open, initialType, initialDate, initialTime]);

  if (!open) return null;

  const create = async () => {
    if (!leadId || !title.trim() || !date) return;
    try{
      setBusy(true);
      // Persist as lead task (date precision) and also emit calendar event with time
      const start = new Date(`${date}T${time}:00`);
      // Persist exact time in calendar_events
      await insertEvent({ lead_id: leadId, title: title.trim(), start_at: start, kind: type, reminder_minutes: 15 });
      // Also log as lead task for task-type (optional; keeps task lists in sync)
      if (type === 'task') await createLeadTask(leadId, { title: title.trim(), due_date: date });
      try { window.dispatchEvent(new CustomEvent('autostand:calendar:event', { detail: { lead_id: leadId, title: title.trim(), start, kind: type } })); } catch {}
      onCreated?.();
      onClose?.();
    }finally{ setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/30 flex items-start justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-medium">New Calendar Item</div>
          <button className="p-2 rounded border" onClick={onClose}><FiX/></button>
        </div>
        <div className="p-4 space-y-3">
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Type</div>
            <select className="w-full rounded-lg border px-3 py-2 text-sm" value={type} onChange={(e)=>{ setType(e.target.value); if (!title) setTitle(suggestTitle(e.target.value)); }}>
              <option value="task">Task</option>
              <option value="schedule">Schedule</option>
              <option value="reminder">Reminder</option>
            </select>
          </label>
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Lead</div>
            <select className="w-full rounded-lg border px-3 py-2 text-sm" value={leadId} onChange={(e)=> setLeadId(e.target.value)}>
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.name || l.plate || l.id}</option>
              ))}
            </select>
          </label>
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Title</div>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={title} onChange={(e)=> setTitle(e.target.value)} placeholder="e.g., Call back, send photos"/>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm block">
              <div className="text-slate-600 mb-1">Date</div>
              <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={date} onChange={(e)=> setDate(e.target.value)} />
            </label>
            <label className="text-sm block">
              <div className="text-slate-600 mb-1">Time</div>
              <input type="time" className="w-full rounded-lg border px-3 py-2 text-sm" value={time} onChange={(e)=> setTime(e.target.value)} />
            </label>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button className="px-3 py-2 border rounded" onClick={onClose}>Cancel</button>
            <button className="px-3 py-2 rounded bg-gray-900 text-white inline-flex items-center gap-2" onClick={create} disabled={busy || !leadId || !title.trim() || !date}>
              <FiSave/> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function toDateInput(d){ try{ return new Date(d).toISOString().slice(0,10); }catch{return ''} }
function toTimeInput(d){ try{ const x=new Date(d); return String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0'); }catch{return '10:00'} }
function suggestTitle(kind){ if (kind==='schedule') return 'Schedule'; if (kind==='reminder') return 'Reminder'; return 'Task'; }
