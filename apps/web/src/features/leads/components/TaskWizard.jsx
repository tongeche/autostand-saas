import React, { useEffect, useMemo, useState } from "react";
import { FiX, FiSave, FiClock, FiBell, FiUser } from "react-icons/fi";
import { createLeadTask, fetchLeadTasks } from "../services/supabase";

export default function TaskWizard({ open, lead, onClose, onCreated, defaultAssignee = "auto" }){
  const [title, setTitle] = useState("");
  const [dueInput, setDueInput] = useState(""); // datetime-local string
  const [assignee, setAssignee] = useState(defaultAssignee || "auto");
  const [remind, setRemind] = useState(false);
  const [remindBefore, setRemindBefore] = useState(60); // minutes
  const [busy, setBusy] = useState(false);

  useEffect(()=>{
    if (!open) return;
    // defaults
    setTitle("");
    const d = new Date(); d.setDate(d.getDate()+1); d.setMinutes(0,0,0);
    setDueInput(toLocalInput(d));
    setAssignee(defaultAssignee || (lead?.owner_id ? "owner" : (lead?.assignee_id ? "assigned" : "auto")));
    setRemind(false);
    setRemindBefore(60);
  }, [open, lead, defaultAssignee]);

  if (!open) return null;

  const onSave = async () => {
    if (!title.trim()) return alert("Please enter a task title");
    try {
      setBusy(true);
      const due_date = dueInput ? new Date(dueInput).toISOString() : null;
      let assignee_id = null;
      if (assignee === 'owner') assignee_id = lead?.owner_id || null;
      else if (assignee === 'assigned') assignee_id = lead?.assignee_id || null;
      else if (assignee === 'auto') assignee_id = lead?.owner_id || lead?.assignee_id || null;
      const task = await createLeadTask(lead.id, { title: title.trim(), due_date, assignee_id });
      if (remind && due_date) {
        const remind_at = new Date(new Date(due_date).getTime() - remindBefore*60*1000);
        try { window.dispatchEvent(new CustomEvent("autostand:task:reminder", { detail: { lead_id: lead.id, task_id: task.id, remind_at } })); } catch {}
      }
      onCreated?.(task);
      try { window.dispatchEvent(new CustomEvent("autostand:lead_task:created", { detail: { task } })); } catch {}
      onClose?.();
    } catch (e) {
      console.error("Task create failed", e);
      alert(e?.message || "Failed to create task");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-medium">New Task</div>
          <button onClick={onClose} className="p-2 rounded border hover:bg-gray-50" aria-label="Close"><FiX/></button>
        </div>

        <div className="p-4 space-y-3">
          {/* Title */}
          <label className="text-sm block">
            <div className="text-slate-600 mb-1 inline-flex items-center gap-2"><FiFileTextIcon/> Title</div>
            <input className="w-full rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/60" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="e.g., Call customer, send brochure"/>
          </label>

          {/* Due */}
          <label className="text-sm block">
            <div className="text-slate-600 mb-1 inline-flex items-center gap-2"><FiClock className="text-slate-500"/> Due date</div>
            <input type="datetime-local" className="w-full rounded-lg px-3 py-2 text-sm border border-slate-200" value={dueInput} onChange={(e)=>setDueInput(e.target.value)} />
          </label>

          {/* Assignee */}
          <label className="text-sm block">
            <div className="text-slate-600 mb-1 inline-flex items-center gap-2"><FiUser className="text-slate-500"/> Assignee</div>
            <select className="w-full rounded-lg px-3 py-2 text-sm border border-slate-200 bg-white" value={assignee} onChange={(e)=>setAssignee(e.target.value)}>
              <option value="auto">Auto</option>
              {lead?.owner_id ? <option value="owner">Lead Owner</option> : null}
              {lead?.assignee_id && lead?.assignee_id !== lead?.owner_id ? <option value="assigned">Assigned</option> : null}
              <option value="none">Unassigned</option>
            </select>
          </label>

          {/* Reminder */}
          <div className="text-sm">
            <div className="text-slate-600 mb-1 inline-flex items-center gap-2"><FiBell className="text-slate-500"/> Reminder</div>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4" checked={remind} onChange={(e)=>setRemind(e.target.checked)} />
                <span>Remind me</span>
              </label>
              <select disabled={!remind} className="rounded px-2 py-1 border text-sm disabled:opacity-50" value={remindBefore} onChange={(e)=>setRemindBefore(Number(e.target.value))}>
                <option value={5}>5 min before</option>
                <option value={15}>15 min before</option>
                <option value={30}>30 min before</option>
                <option value={60}>1 hour before</option>
                <option value={120}>2 hours before</option>
                <option value={1440}>1 day before</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" className="px-3 py-2 border rounded" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="button" className="px-3 py-2 rounded bg-gray-900 text-white inline-flex items-center gap-2" onClick={onSave} disabled={busy || !title.trim()}>
              <FiSave/> Save Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FiFileTextIcon(props){
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M14 2v6h6" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M16 13H8M16 17H8" fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function toLocalInput(d){
  try{
    const pad=(n)=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }catch{return ""}
}
