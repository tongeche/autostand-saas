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
import { listTenantActivity, listUpcomingTasksTenant } from "../../features/leads/services/supabase";
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
  const [quickOpen, setQuickOpen] = useState(false);
  const [sparks, setSparks] = useState({ total: [], news: [], active: [], inventory: [] });

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const data = await fetchStats();
        setStats(data);
        const [t, r, ev, fn] = await Promise.all([
          listUpcomingTasksTenant({ limit: 6 }),
          listDeliverable({ onlyUnread: true, limit: 6 }),
          fetchTodayEvents(),
          fetchFunnel(),
        ]);
        setUpcoming(t || []);
        setReminders(r || []);
        setTodayEvents(ev || []);
        setFunnel(fn || { new:0, contacted:0, qualified:0, won:0, lost:0 });
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
          const [t, r, ev, fn] = await Promise.all([
            listUpcomingTasksTenant({ limit: 6 }),
            listDeliverable({ onlyUnread: true, limit: 6 }),
            fetchTodayEvents(),
            fetchFunnel(),
          ]);
          setUpcoming(t || []);
          setReminders(r || []);
          setTodayEvents(ev || []);
          setFunnel(fn || { new:0, contacted:0, qualified:0, won:0, lost:0 });
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
            <Task key={t.id} text={t.title || '(untitled)'} right={<span className="text-xs text-slate-600">{t.due_date ? formatShortDate(t.due_date) : '—'}</span>} />
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
            <div key={n.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 hover:bg-slate-100">
              <div className="text-sm truncate">{n.title}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">{new Date(n.deliver_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                <button className="text-xs underline" onClick={async()=>{ try{ await markRead(n.id); setReminders(prev => prev.filter(x=> x.id !== n.id)); }catch{} }}>Done</button>
              </div>
            </div>
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
