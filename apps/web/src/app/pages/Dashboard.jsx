import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUsers,
  FiTrendingUp,
  FiBox,
  FiActivity,
  FiTarget,
} from "react-icons/fi"; // + FiTarget
import { supabase } from "../../lib/supabase";
import { getTenantId } from "../../lib/tenant";
import { listEventsBetween } from "../../features/calendar/services/events";
import { fetchStats } from "../../features/dashboard/stats";
import { listTenantActivity, listUpcomingTasksTenant, updateLeadTask, toggleLeadTaskDone, deleteLeadTask } from "../../features/leads/services/supabase";
import { listDeliverable, markRead } from "../../features/notifications/services/notifications";
import QuickTaskModal from "../../features/todos/components/QuickTaskModal.jsx";
import { formatShortDate } from "../../features/todos/components/shared";

function Stat({ icon, label, value, right, tone='indigo', spark=[] }) {
  const tones = {
    indigo:  'from-indigo-50 to-white text-indigo-800',
    emerald: 'from-emerald-50 to-white text-emerald-800',
    amber:   'from-amber-50 to-white text-amber-800',
    sky:     'from-sky-50 to-white text-sky-800',
    violet:  'from-violet-50 to-white text-violet-800',
  };
  const t = tones[tone] || tones.indigo;
  return (
    <div className={`p-3 md:p-4 lg:p-5 rounded-2xl shadow-sm bg-gradient-to-br ${t}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 grid place-items-center rounded-lg bg-white/70">
            {icon}
          </div>
          <div className="text-sm text-slate-600">{label}</div>
        </div>
        {right}
      </div>
      <div className="text-2xl md:text-3xl font-semibold mt-2">{value}</div>
      {spark && spark.length > 0 && (
        <div className="mt-2"><Sparkline data={spark} colorClass="stroke-current opacity-60" /></div>
      )}
    </div>
  );
}
function Badge({ children }) {
  return (
    <span className="text-xs rounded px-2 py-0.5 bg-accent/40">{children}</span>
  );
}
function Panel({ title, action, children }) {
  return (
    <div className="p-3 md:p-4 lg:p-5 rounded-2xl shadow-sm bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">{title}</div>
        {action}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function ListItem({ text, tag }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 hover:bg-slate-100">
      <div className="text-sm">{text}</div>
      {tag && (
        <span className="text-xs px-2 py-1 rounded-full bg-accent/50 text-primary">
          {tag}
        </span>
      )}
    </div>
  );
}
function Task({ text, right }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 hover:bg-slate-100">
      <div className="flex items-center gap-3">
        <input type="checkbox" className="accent-[var(--color-primary)]" disabled />
        <span className="text-sm">{text}</span>
      </div>
      {right}
    </div>
  );
}

function InlineTaskRow({ task, onChange, onToggleDone, onDelete }){
  const [editing, setEditing] = useState(null); // null | 'title' | 'due'
  const [title, setTitle] = useState(task?.title||'');
  const [due, setDue] = useState(task?.due_date || '');
  useEffect(()=>{ setTitle(task?.title||''); setDue(task?.due_date||''); setEditing(null); }, [task?.id]);

  const saveTitle = async ()=>{
    await onChange?.({ title });
    setEditing(null);
  };
  const saveDue = async ()=>{
    await onChange?.({ due_date: due||null });
    setEditing(null);
  };

  const onKey = (e, saveFn, cancelFn) => {
    if (e.key === 'Enter') { e.preventDefault(); saveFn(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelFn(); }
  };

  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 hover:bg-slate-100">
      <div className="flex items-center gap-3 min-w-0">
        <input
          type="checkbox"
          className="accent-[var(--color-primary)]"
          checked={task.status==='done' || task.done}
          onChange={(e)=> onToggleDone?.(e.target.checked)}
          onClick={(e)=> e.stopPropagation()}
        />
        <div className="min-w-0">
          {editing === 'title' ? (
            <div className="flex items-center gap-2">
              <input
                className="text-sm bg-white rounded border px-2 py-1 w-56"
                value={title}
                autoFocus
                onChange={(e)=> setTitle(e.target.value)}
                onKeyDown={(e)=> onKey(e, saveTitle, ()=>{ setTitle(task.title||''); setEditing(null); })}
                onClick={(e)=> e.stopPropagation()}
              />
              <button className="text-xs px-2 py-1 rounded border" onClick={(e)=>{ e.stopPropagation(); setTitle(task.title||''); setEditing(null); }}>Cancel</button>
              <button className="text-xs px-2 py-1 rounded bg-gray-900 text-white" onClick={(e)=>{ e.stopPropagation(); saveTitle(); }}>Save</button>
            </div>
          ) : (
            <button className="text-left text-sm truncate" onClick={()=> setEditing('title')} title="Edit title">{task.title || '(untitled)'}</button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {editing === 'due' ? (
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="text-xs bg-white rounded border px-2 py-1"
              value={due||''}
              autoFocus
              onChange={(e)=> setDue(e.target.value)}
              onKeyDown={(e)=> onKey(e, saveDue, ()=>{ setDue(task.due_date||''); setEditing(null); })}
              onClick={(e)=> e.stopPropagation()}
            />
            <button className="text-xs px-2 py-1 rounded border" onClick={(e)=>{ e.stopPropagation(); setDue(task.due_date||''); setEditing(null); }}>Cancel</button>
            <button className="text-xs px-2 py-1 rounded bg-gray-900 text-white" onClick={(e)=>{ e.stopPropagation(); saveDue(); }}>Save</button>
          </div>
        ) : (
          <button className="text-xs text-slate-600" onClick={()=> setEditing('due')} title="Edit due date">{task.due_date ? formatShortDate(task.due_date) : '—'}</button>
        )}
        <button className="text-xs px-2 py-1 rounded border border-red-200 text-red-700" onClick={(e)=>{ e.stopPropagation(); onDelete?.(); }}>Delete</button>
      </div>
    </div>
  );
}

function toLocalInput(dt){ try{ const d=new Date(dt); const p=(n)=> String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }catch{return ''} }

function InlineReminderRow({ notif, onChange, onDelete, onDone }){
  const [editing, setEditing] = useState(null); // null | 'title' | 'time'
  const [title, setTitle] = useState(notif?.title||'');
  const [time, setTime] = useState(()=> toLocalInput(notif.deliver_at)); // local input datetime-local value
  useEffect(()=>{ setTitle(notif?.title||''); setTime(toLocalInput(notif.deliver_at)); setEditing(null); }, [notif?.id]);

  const saveTitle = async ()=>{ await onChange?.({ title }); setEditing(null); };
  const saveTime = async ()=>{ const dt = time ? new Date(time) : new Date(notif.deliver_at); await onChange?.({ deliver_at: dt }); setEditing(null); };
  const onKey = (e, saveFn, cancelFn)=>{ if (e.key==='Enter'){ e.preventDefault(); saveFn(); } if (e.key==='Escape'){ e.preventDefault(); cancelFn(); } };

  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 hover:bg-slate-100">
      <div className="text-sm truncate min-w-0">
        {editing === 'title' ? (
          <div className="flex items-center gap-2">
            <input className="text-sm bg-white rounded border px-2 py-1 w-48" value={title} autoFocus onChange={(e)=> setTitle(e.target.value)} onKeyDown={(e)=> onKey(e, saveTitle, ()=>{ setTitle(notif.title||''); setEditing(null); })} onClick={(e)=> e.stopPropagation()} />
            <button className="text-xs px-2 py-1 rounded border" onClick={(e)=>{ e.stopPropagation(); setTitle(notif.title||''); setEditing(null); }}>Cancel</button>
            <button className="text-xs px-2 py-1 rounded bg-gray-900 text-white" onClick={(e)=>{ e.stopPropagation(); saveTitle(); }}>Save</button>
          </div>
        ) : (
          <button className="truncate" onClick={()=> setEditing('title')} title="Edit title">{notif.title}</button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {editing === 'time' ? (
          <div className="flex items-center gap-2">
            <input type="datetime-local" className="text-xs bg-white rounded border px-2 py-1" value={time} autoFocus onChange={(e)=> setTime(e.target.value)} onKeyDown={(e)=> onKey(e, saveTime, ()=>{ setTime(toLocalInput(notif.deliver_at)); setEditing(null); })} onClick={(e)=> e.stopPropagation()} />
            <button className="text-xs px-2 py-1 rounded border" onClick={(e)=>{ e.stopPropagation(); setTime(toLocalInput(notif.deliver_at)); setEditing(null); }}>Cancel</button>
            <button className="text-xs px-2 py-1 rounded bg-gray-900 text-white" onClick={(e)=>{ e.stopPropagation(); saveTime(); }}>Save</button>
          </div>
        ) : (
          <button className="text-xs text-slate-600" onClick={()=> setEditing('time')} title="Edit time">{new Date(notif.deliver_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</button>
        )}
        <button className="text-xs underline" onClick={(e)=>{ e.stopPropagation(); onDone?.(); }}>Done</button>
        <button className="text-xs px-2 py-1 rounded border border-red-200 text-red-700" onClick={(e)=>{ e.stopPropagation(); onDelete?.(); }}>Delete</button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalLeads: 0,
    newLeads: 0,
    inventory: 0,
    activities7d: 0,
  });
  const [err, setErr] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [funnel, setFunnel] = useState({ new: 0, contacted: 0, qualified: 0, won: 0, lost: 0 });
  const [schedule, setSchedule] = useState([]);
  const [quickOpen, setQuickOpen] = useState(false);
  const [sparks, setSparks] = useState({ total: [], news: [], active: [], inventory: [] });

  // Helper: upcoming schedule events (7d)
  const fetchScheduleSummary = async () => {
    try{
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(); end.setDate(end.getDate()+7); end.setHours(23,59,59,999);
      const events = await listEventsBetween({ from: start, to: end, limit: 50 });
      return (events||[])
        .filter(e => (e.kind||'task') === 'schedule')
        .map(e=>({ id:e.id, title:e.title || '(untitled)', start: new Date(e.start_at), kind: e.kind||'schedule' }))
        .sort((a,b)=> a.start - b.start)
        .slice(0,6);
    }catch{ return []; }
  };

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const data = await fetchStats();
        setStats(data);
        const [t, r, ev, fn, sch] = await Promise.all([
          listUpcomingTasksTenant({ limit: 6 }),
          listDeliverable({ onlyUnread: true, limit: 6 }),
          fetchTodayEvents(),
          fetchFunnel(),
          fetchScheduleSummary(),
        ]);
        setUpcoming(t || []);
        setReminders(r || []);
        setTodayEvents(ev || []);
        setFunnel(fn || { new:0, contacted:0, qualified:0, won:0, lost:0 });
        setSchedule(sch || []);
        setSparks(makeSparks({ stats: data }));
      } catch (e) {
        console.error("Dashboard stats error:", e);
        setErr(e.message || String(e));
      }
    })();
    const onOrgChange = () => {
      (async () => {
        try {
          setErr(null);
          const data = await fetchStats();
          setStats(data);
          const [t, r, ev, fn, sch] = await Promise.all([
            listUpcomingTasksTenant({ limit: 6 }),
            listDeliverable({ onlyUnread: true, limit: 6 }),
            fetchTodayEvents(),
            fetchFunnel(),
            fetchScheduleSummary(),
          ]);
          setUpcoming(t || []);
          setReminders(r || []);
          setTodayEvents(ev || []);
          setFunnel(fn || { new:0, contacted:0, qualified:0, won:0, lost:0 });
          setSchedule(sch || []);
          setSparks(makeSparks({ stats: data }));
        } catch (e) {
          setErr(e.message || String(e));
        }
      })();
    };
    window.addEventListener('org:changed', onOrgChange);
    return () => window.removeEventListener('org:changed', onOrgChange);
  }, []);

  // Open Quick Task from topbar plus dropdown
  useEffect(()=>{
    const open = () => setQuickOpen(true);
    window.addEventListener('autostand:open_quick_task', open);
    return () => window.removeEventListener('autostand:open_quick_task', open);
  }, []);

  async function fetchTodayEvents(){
    try{
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(); end.setHours(23,59,59,999);
      const events = await listEventsBetween({ from: start, to: end, limit: 25 });
      return (events||[]).map(e=>({ id:e.id, title:e.title || '(untitled)', start: new Date(e.start_at), kind: e.kind||'task' }))
        .sort((a,b)=> a.start - b.start).slice(0,6);
    }catch{ return []; }
  }

  async function fetchFunnel(){
    const orgId = getTenantId(); if (!orgId) return { new:0, contacted:0, qualified:0, won:0, lost:0 };
    async function cnt(status){ try{ const { count } = await supabase.from('leads').select('*', { count:'exact', head:true }).eq('org_id', orgId).eq('status', status); return count||0; }catch{ return 0; } }
    const [nw, ct, qf, wn, ls] = await Promise.all([
      cnt('new'), cnt('contacted'), cnt('qualified'), cnt('won'), cnt('lost')
    ]);
    return { new: nw, contacted: ct, qualified: qf, won: wn, lost: ls };
  }

  // moved above as arrow function to avoid hoisting quirks

  function makeSparks({ stats }){
    function synth(base){
      const arr = Array.from({length:7}, ()=> Math.max(1, Math.round(base*(0.6 + Math.random()*0.8))));
      return arr;
    }
    return {
      total: synth((stats?.totalLeads||1)/10+5),
      news: synth((stats?.newLeads||1)/5+3),
      active: synth((stats?.activeLeads||1)/10+4),
      inventory: synth((stats?.inventory||1)/10+4)
    };
  }

  return (
    <div className="space-y-5">
      {err && (
        <div className="card p-3 border-red-200 bg-red-50 text-red-700">
          <div className="font-medium">Stats error</div>
          <div className="text-sm mt-1">{err}</div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
        <Stat
          icon={<FiUsers />}
          label="Total"
          value={stats.totalLeads}
          right={<Badge>all</Badge>}
          tone="indigo"
          spark={sparks.total}
        />
        <Stat
          icon={<FiTrendingUp />}
          label="New"
          value={stats.newLeads}
          right={<Badge>30d</Badge>}
          tone="emerald"
          spark={sparks.news}
        />
        <Stat
          icon={<FiTarget />}
          label="Active"
          value={stats.activeLeads}
          right={<Badge>open</Badge>}
          tone="amber"
          spark={sparks.active}
        />
        <Stat
          icon={<FiBox />}
          label="Inventory"
          value={stats.inventory}
          right={<Badge>items</Badge>}
          tone="sky"
          spark={sparks.inventory}
        />
      </div>

      {/* Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-5">
        <InventorySummary />
        <Panel title="Today's Events" action={<Badge>{todayEvents.length}</Badge>}>
          {todayEvents.length === 0 ? (
            <ListItem text="No events today" />
          ) : todayEvents.map(ev => (
            <ListItem key={ev.id} text={`${ev.title}`} tag={ev.start.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })} />
          ))}
        </Panel>
        <Panel
          title="Tasks"
          action={<button className="rounded-lg px-2 py-1.5 border bg-white text-sm" onClick={()=> setQuickOpen(true)}>+ Add New</button>}
        >
          {upcoming.length === 0 ? (
            <ListItem text="No upcoming tasks" />
          ) : upcoming.map((t) => (
            <InlineTaskRow key={t.id} task={t}
              onChange={async (patch)=>{
                try{ await updateLeadTask(t.id, patch); const next = await listUpcomingTasksTenant({ limit:6 }); setUpcoming(next||[]); }catch(e){ console.error(e); }
              }}
              onToggleDone={async (next)=>{
                try{ await toggleLeadTaskDone(t.id, next); const nextList = await listUpcomingTasksTenant({ limit:6 }); setUpcoming(nextList||[]); }catch(e){ console.error(e); }
              }}
              onDelete={async ()=>{
                try{ await deleteLeadTask(t.id); const nextList = await listUpcomingTasksTenant({ limit:6 }); setUpcoming(nextList||[]); }catch(e){ console.error(e); }
              }}
            />
          ))}
        </Panel>
        <Panel title="Leads Funnel">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <FunnelPill label="New" value={funnel.new} tone="sky" onClick={()=> navigate('/leads?status=new')} />
            <FunnelPill label="Contacted" value={funnel.contacted} tone="violet" onClick={()=> navigate('/leads?status=contacted')} />
            <FunnelPill label="Qualified" value={funnel.qualified} tone="emerald" onClick={()=> navigate('/leads?status=qualified')} />
            <FunnelPill label="Won" value={funnel.won} tone="amber" onClick={()=> navigate('/leads?status=won')} />
            <FunnelPill label="Lost" value={funnel.lost} tone="rose" onClick={()=> navigate('/leads?status=lost')} />
          </div>
        </Panel>
        <Panel title="Reminders">
          {(!reminders || reminders.length === 0) ? (
            <ListItem text="No reminders" />
          ) : reminders.map((n) => (
            <InlineReminderRow key={n.id} notif={n}
              onChange={async (patch)=>{
                try{
                  const payload = { ...patch };
                  if (payload.deliver_at instanceof Date) payload.deliver_at = payload.deliver_at.toISOString();
                  await supabase.from('notifications').update(payload).eq('id', n.id);
                  const next = await listDeliverable({ onlyUnread:true, limit:6 }); setReminders(next||[]);
                }catch(e){ console.error(e); }
              }}
              onDelete={async ()=>{
                try{ await supabase.from('notifications').delete().eq('id', n.id); const next = await listDeliverable({ onlyUnread:true, limit:6 }); setReminders(next||[]); }catch(e){ console.error(e); }
              }}
              onDone={async ()=>{
                try{ await markRead(n.id); setReminders(prev => prev.filter(x=> x.id !== n.id)); }catch{}
              }}
            />
          ))}
        </Panel>

        <Panel title="Schedule Summary" action={<Badge>{schedule.length}</Badge>}>
          {schedule.length === 0 ? (
            <ListItem text="No scheduled events in 7d" />
          ) : schedule.map(ev => (
            <ListItem key={ev.id} text={`${ev.title}`} tag={ev.start.toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })} />
          ))}
        </Panel>
      </div>

      <QuickTaskModal open={quickOpen} onClose={()=> setQuickOpen(false)} onCreated={()=>{
        // reload upcoming quickly
        listUpcomingTasksTenant({ limit: 6 }).then(setUpcoming).catch(()=>{});
        listDeliverable({ onlyUnread: true, limit: 6 }).then(setReminders).catch(()=>{});
      }}/>
    </div>
  );
}

function InventorySummary(){
  const [sum, setSum] = useState({ total: 0, monthNew: 0 });
  useEffect(()=>{
    (async ()=>{
      try{
        const orgId = getTenantId(); if (!orgId) return;
        // Determine business type
        let businessType = 'cars';
        try{ const { data: s } = await supabase.from('org_settings').select('business_type').eq('org_id', orgId).maybeSingle(); if (s?.business_type) businessType = s.business_type; }catch{}
        const now = new Date(); const first = new Date(now.getFullYear(), now.getMonth(), 1);
        async function cnt(table, dateCol){
          try{ const { count } = await supabase.from(table).select('*', { count:'exact', head:true }).eq('org_id', orgId); const { count: c2 } = await supabase.from(table).select('*', { count:'exact', head:true }).eq('org_id', orgId).gte(dateCol, first.toISOString()); return { total: count||0, month: c2||0 }; }catch{ return { total:0, month:0 }; }
        }
        let res;
        if (businessType==='general') res = await cnt('inventory_items','created_at'); else res = await cnt('cars','created_at');
        setSum({ total: res.total, monthNew: res.month });
      }catch{}
    })();
  }, []);
  return (
    <Panel title="Inventory Summary" action={<Badge>{sum.monthNew} this month</Badge>}>
      <div className="text-sm text-slate-700">Total items</div>
      <div className="text-2xl font-semibold">{sum.total.toLocaleString()}</div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-emerald-50 text-emerald-800 p-3 text-sm">New this month<br/><span className="text-xl font-semibold">{sum.monthNew}</span></div>
        <div className="rounded-xl bg-sky-50 text-sky-800 p-3 text-sm">Total items<br/><span className="text-xl font-semibold">{sum.total}</span></div>
      </div>
      <div className="mt-3"><a href="/inventory" className="text-sm underline text-primary">View inventory →</a></div>
    </Panel>
  );
}

function FunnelPill({ label, value, tone='indigo' }){
  const tones = {
    sky: 'bg-sky-50 text-sky-800',
    violet: 'bg-violet-50 text-violet-800',
    emerald: 'bg-emerald-50 text-emerald-800',
    amber: 'bg-amber-50 text-amber-800',
    rose: 'bg-rose-50 text-rose-800',
    indigo: 'bg-indigo-50 text-indigo-800',
  };
  const t = tones[tone] || tones.indigo;
  return (
    <button className={`rounded-xl p-3 ${t} flex items-center justify-between w-full`} onClick={()=>{}}>
      <span>{label}</span>
      <span className="text-xl font-semibold">{value}</span>
    </button>
  );
}

function Sparkline({ data=[], width=120, height=30, colorClass='' }){
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const xy = (v,i) => {
    const x = (i/(data.length-1))*width;
    const y = height - ((v-min)/(max-min || 1))*height;
    return `${x},${y}`;
  };
  const pts = data.map((v,i)=> xy(v,i)).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={colorClass}>
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={pts} />
    </svg>
  );
}
