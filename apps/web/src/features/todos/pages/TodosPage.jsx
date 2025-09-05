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
const STATUS_OPTIONS = ["all", "open", "overdue", "done"];

export default function TodosPage(){
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("open");
  const [view, setView] = useState("kanban"); // kanban | table | list | timeline
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [leadNames, setLeadNames] = useState({});

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
          .eq("tenant_id", getTenantId())
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

  return (
    <div className="space-y-4 p-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xl font-semibold">Tasks</div>
          <div className="ml-2 inline-flex rounded-xl border bg-white overflow-hidden">
            <button className={`px-3 py-1.5 text-sm ${view==='kanban' ? 'bg-slate-900 text-white' : ''}`} onClick={()=> setView('kanban')}>Kanban</button>
            <button className={`px-3 py-1.5 text-sm ${view==='table' ? 'bg-slate-900 text-white' : ''}`} onClick={()=> setView('table')}>Table</button>
            <button className={`px-3 py-1.5 text-sm ${view==='list' ? 'bg-slate-900 text-white' : ''}`} onClick={()=> setView('list')}>List</button>
            <button className={`px-3 py-1.5 text-sm ${view==='timeline' ? 'bg-slate-900 text-white' : ''}`} onClick={()=> setView('timeline')}>Timeline</button>
          </div>
          {loading && (<span className="text-xs text-slate-500 animate-pulse">loading…</span>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2 bg-white">
            <FiSearch className="text-slate-500" />
            <input
              className="outline-none text-sm min-w-[180px]"
              placeholder="Search tasks…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') load({ resetPage: true }); }}
            />
          </div>
          {/* Status filter */}
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2 bg-white">
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
        <div className="overflow-auto">
          <table className="min-w-full border rounded-xl overflow-hidden">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm">
                <th className="px-3 py-2 border-b">Title</th>
                <th className="px-3 py-2 border-b">Lead</th>
                <th className="px-3 py-2 border-b">Due</th>
                <th className="px-3 py-2 border-b">Status</th>
                <th className="px-3 py-2 border-b">Assignee</th>
                <th className="px-3 py-2 border-b">Created</th>
              </tr>
            </thead>
            <tbody>
              {(!rows || rows.length===0) ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">No tasks</td></tr>
              ) : rows.map(t => (
                <tr key={t.id} className="text-sm">
                  <td className="px-3 py-2 border-b">
                    <div className="flex items-center gap-2">
                      {t.status === 'done' ? <FiCheckCircle className="text-green-600"/> : <FiClock className="text-slate-500"/>}
                      <span className={t.status==='done' ? 'line-through text-slate-500' : ''}>{t.title || '(untitled)'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 border-b">{leadNames[t.lead_id]?.name || t.lead_id}</td>
                  <td className="px-3 py-2 border-b">{t.due_date ? new Date(t.due_date).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2 border-b"><span className={`rounded-full px-2 py-1 text-xs ${t.status==='done' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{t.status || 'open'}</span></td>
                  <td className="px-3 py-2 border-b">{t.assignee_id || '—'}</td>
                  <td className="px-3 py-2 border-b">{t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</td>
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
        <div className="text-sm text-slate-600">{total.toLocaleString()} total • Page {page + 1} of {pageCount}</div>
        <div className="flex items-center gap-2">
          <button className="icon-btn" disabled={!canPrev} onClick={()=> canPrev && setPage(p=>p-1)} title="Previous">‹</button>
          <button className="icon-btn" disabled={!canNext} onClick={()=> canNext && setPage(p=>p+1)} title="Next">›</button>
        </div>
      </div>
    </div>
  );
}
