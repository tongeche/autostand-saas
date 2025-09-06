import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { FiRefreshCw, FiSearch, FiFilter, FiClock, FiCheckCircle } from "react-icons/fi";
import { supabase } from "../../../lib/supabase";
import { getTenantId } from "../../../lib/tenant";
import { listTenantLeadTasks, updateLeadTask } from "../../leads/services/supabase";
import KanbanBoard from "../components/KanbanBoard.jsx";
import ListView from "../components/ListView.jsx";
import TimelineView from "../components/TimelineView.jsx";

const PAGE_SIZE = 25;
const VISIBLE_ROWS = 8; // show at most 8; rest searchable
const STATUS_OPTIONS = ["all", "open", "overdue", "done"];

export default function TodosPage(){
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("open");
  const [view, setView] = useState("timeline"); // kanban | table | list | timeline
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [leadNames, setLeadNames] = useState({});
  const [quickOpen, setQuickOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const offset = page * PAGE_SIZE;
  const pageCount = useMemo(()=> Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  async function load({ resetPage=false } = {}){
    setLoading(true); setErr(null);
    try {
      const onlyOpen = status === 'open';
      const overdue = status === 'overdue';
      const done = status === 'done';
      const { rows: tasks, total: cnt } = await listTenantLeadTasks({ q, onlyOpen, overdue, status: done ? 'done' : 'all', limit: PAGE_SIZE, offset: resetPage ? 0 : offset });
      setRows(tasks);
      setTotal(cnt);
      if (resetPage) setPage(0);
      // collect lead names
      const ids = Array.from(new Set((tasks||[]).map(t => t.lead_id).filter(Boolean)));
      if (ids.length){
        const { data, error } = await supabase
          .from("leads")
          .select("id,name,plate")
          .eq("org_id", getTenantId())
          .in("id", ids);
        if (!error && Array.isArray(data)){
          const map = {}; data.forEach(l => { map[l.id] = l; });
          setLeadNames(map);
        }
      } else setLeadNames({});
    } catch(e){ setErr(e.message || String(e)); } finally { setLoading(false); }
  }

  useEffect(()=>{ load({ resetPage: true }); }, [status]);
  useEffect(()=>{ load(); }, [page]);
  useEffect(()=>{
    const onCreated = () => load({ resetPage: false });
    window.addEventListener("autostand:lead_task:created", onCreated);
    return () => window.removeEventListener("autostand:lead_task:created", onCreated);
  }, []);
  useEffect(()=>{
    const params = new URLSearchParams(location.search);
    const v = params.get('view');
    if (v && ['kanban','table','list','timeline'].includes(v)) setView(v);
  }, [location.search]);

  const canPrev = page > 0;
  const canNext = offset + PAGE_SIZE < total;
  const displayRows = useMemo(()=> rows.slice(0, VISIBLE_ROWS), [rows]);

  return (
    <div className="space-y-4 p-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-xl font-semibold">Tasks</div>
          {/* View toggle — segmented on desktop, select on mobile */}
          <div className="hidden sm:inline-flex ml-2 rounded-xl border border-gray-200 bg-white overflow-hidden">
            <button className={`px-3 py-1.5 text-sm ${view==='kanban' ? 'bg-slate-900 text-white' : ''}`} onClick={()=> setView('kanban')}>Kanban</button>
            <button className={`px-3 py-1.5 text-sm ${view==='table' ? 'bg-slate-900 text-white' : ''}`} onClick={()=> setView('table')}>Table</button>
            <button className={`px-3 py-1.5 text-sm ${view==='list' ? 'bg-slate-900 text-white' : ''}`} onClick={()=> setView('list')}>List</button>
            <button className={`px-3 py-1.5 text-sm ${view==='timeline' ? 'bg-slate-900 text-white' : ''}`} onClick={()=> setView('timeline')}>Timeline</button>
          </div>
          <div className="sm:hidden w-full">
            <select className="input w-full" value={view} onChange={(e)=> setView(e.target.value)}>
              <option value="kanban">Kanban</option>
              <option value="table">Table</option>
              <option value="list">List</option>
              <option value="timeline">Timeline</option>
            </select>
          </div>
          {loading && (<span className="text-xs text-slate-500 animate-pulse">loading…</span>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 bg-white w-full sm:w-auto min-w-0">
            <FiSearch className="text-slate-500" />
            <input
              className="outline-none text-sm min-w-0 w-full sm:w-64"
              placeholder="Search tasks…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') load({ resetPage: true }); }}
            />
          </div>
          {/* Status filter */}
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 bg-white">
            <FiFilter className="text-slate-500" />
            <select className="text-sm outline-none bg-transparent" value={status} onChange={(e)=>setStatus(e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button className="icon-btn" title="Refresh" onClick={()=> load({ resetPage: false })}><FiRefreshCw/></button>
        </div>
      </div>

      {/* Error */}
      {err && <div className="card p-3 bg-red-50 border-red-200 text-red-700 text-sm">{err}</div>}

      {view === 'kanban' ? (
        <KanbanBoard
          tasks={rows}
          leads={leadNames}
          onMove={async (taskId, nextStatus) => {
            try {
              await updateLeadTask(taskId, { status: nextStatus });
              setRows(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
            } catch (e) {
              alert(e?.message || 'Failed to update status');
            }
          }}
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm table-fixed">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm">
                <th className="px-3 py-2 border-b border-gray-200 w-1/4">Lead</th>
                <th className="px-3 py-2 border-b border-gray-200 w-2/5">Title</th>
                <th className="px-3 py-2 border-b border-gray-200 w-1/5">Assignee</th>
                <th className="px-3 py-2 border-b border-gray-200 w-1/6">Status</th>
              </tr>
            </thead>
            <tbody>
              {(!rows || rows.length===0) ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">No tasks</td></tr>
              ) : displayRows.map((t) => (
                <tr key={t.id} className="odd:bg-white even:bg-slate-50 hover:bg-slate-50 cursor-pointer"
                  onClick={()=> { setSelected(t); setQuickOpen(true); }}
                  tabIndex={0}
                  onKeyDown={(e)=> { if (e.key==='Enter'){ setSelected(t); setQuickOpen(true); } }}
                >
                  <td className="px-3 py-2 border-t border-gray-200 align-top break-words whitespace-normal">{leadNames[t.lead_id]?.name || t.lead_id}</td>
                  <td className="px-3 py-2 border-t border-gray-200 align-top break-words whitespace-normal">
                    <div className="flex items-start gap-2">
                      {t.status === 'done' ? <FiCheckCircle className="text-green-600 mt-0.5"/> : <FiClock className="text-slate-500 mt-0.5"/>}
                      <span className={t.status==='done' ? 'line-through text-slate-500' : ''}>{t.title || '(untitled)'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 border-t border-gray-200 align-top break-words whitespace-normal">{t.assignee_id || '—'}</td>
                  <td className="px-3 py-2 border-t border-gray-200 align-top"><span className={`rounded-full px-2 py-1 text-xs ${t.status==='done' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{t.status || 'open'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'list' && (
        <ListView tasks={rows} leads={leadNames} />
      )}

      {view === 'timeline' && (
        <TimelineView tasks={rows} leads={leadNames} />
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-slate-600">Showing {Math.min(displayRows.length, VISIBLE_ROWS)} of {total.toLocaleString()}</div>
        <div className="flex items-center gap-2">
          <button className="icon-btn" disabled={!canPrev} onClick={()=> canPrev && setPage(p=>p-1)} title="Previous">‹</button>
          <button className="icon-btn" disabled={!canNext} onClick={()=> canNext && setPage(p=>p+1)} title="Next">›</button>
        </div>
      </div>

      <QuickTaskEditModal
        open={quickOpen}
        task={selected}
        lead={selected ? leadNames[selected.lead_id] : null}
        onClose={()=> { setQuickOpen(false); setSelected(null); }}
        onSaved={async (patch)=> {
          if (!selected) return;
          try{
            const updated = await updateLeadTask(selected.id, patch);
            setRows(prev => prev.map(t => t.id === selected.id ? { ...t, ...updated } : t));
            setQuickOpen(false); setSelected(null);
          }catch(e){ alert(e?.message || 'Update failed'); }
        }}
      />
    </div>
  );
}

function QuickTaskEditModal({ open, task, lead, onClose, onSaved }){
  const [title, setTitle] = useState(task?.title || '');
  const [due, setDue] = useState(task?.due_date ? new Date(task.due_date).toISOString().slice(0,16) : '');
  const [status, setStatus] = useState(task?.status || 'open');
  useEffect(()=>{
    if (open){
      setTitle(task?.title || '');
      setDue(task?.due_date ? new Date(task.due_date).toISOString().slice(0,16) : '');
      setStatus(task?.status || 'open');
    }
  }, [open, task]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-medium">Edit Task</div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="p-4 space-y-3 text-sm">
          {lead && <div className="text-slate-600">Lead: <span className="font-medium">{lead.name}</span></div>}
          <div>
            <div className="text-slate-600 mb-1">Title</div>
            <input className="input w-full" value={title} onChange={(e)=> setTitle(e.target.value)} />
          </div>
          <div>
            <div className="text-slate-600 mb-1">Due</div>
            <input type="datetime-local" className="input w-full" value={due} onChange={(e)=> setDue(e.target.value)} />
          </div>
          <div>
            <div className="text-slate-600 mb-1">Status</div>
            <select className="input w-full" value={status} onChange={(e)=> setStatus(e.target.value)}>
              <option value="open">open</option>
              <option value="done">done</option>
            </select>
          </div>
        </div>
        <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
          <button className="px-3 py-2 rounded border" onClick={onClose}>Cancel</button>
          <button className="px-3 py-2 rounded bg-gray-900 text-white" onClick={()=> onSaved?.({ title, due_date: due || null, status })}>Save</button>
        </div>
      </div>
    </div>
  );
}
