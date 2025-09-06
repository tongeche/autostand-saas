import { useEffect, useState } from "react";
import {
  FiUsers,
  FiTrendingUp,
  FiBox,
  FiActivity,
  FiTarget,
} from "react-icons/fi"; // + FiTarget
import { fetchStats } from "../../features/dashboard/stats";
import { listTenantActivity, listUpcomingTasksTenant } from "../../features/leads/services/supabase";
import QuickTaskModal from "../../features/todos/components/QuickTaskModal.jsx";
import { formatShortDate } from "../../features/todos/components/shared";

function Stat({ icon, label, value, right }) {
  return (
    <div className="card p-3 md:p-4 lg:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 grid place-items-center rounded-lg bg-accent/60 text-primary">
            {icon}
          </div>
          <div className="text-sm text-slate-600">{label}</div>
        </div>
        {right}
      </div>
      <div className="text-2xl md:text-3xl font-semibold mt-2">{value}</div>
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
    <div className="card p-3 md:p-4 lg:p-5">
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
    <div className="flex items-center justify-between rounded-xl border px-3 py-2">
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
    <div className="flex items-center justify-between rounded-xl border px-3 py-2">
      <div className="flex items-center gap-3">
        <input type="checkbox" className="accent-[var(--color-primary)]" disabled />
        <span className="text-sm">{text}</span>
      </div>
      {right}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    newLeads: 0,
    inventory: 0,
    activities7d: 0,
  });
  const [err, setErr] = useState(null);
  const [acts, setActs] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [quickOpen, setQuickOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const data = await fetchStats();
        setStats(data);
        const [a, t] = await Promise.all([
          listTenantActivity({ limit: 8 }),
          listUpcomingTasksTenant({ limit: 6 }),
        ]);
        setActs(a || []);
        setUpcoming(t || []);
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
          const [a, t] = await Promise.all([
            listTenantActivity({ limit: 8 }),
            listUpcomingTasksTenant({ limit: 6 }),
          ]);
          setActs(a || []);
          setUpcoming(t || []);
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
        />
        <Stat
          icon={<FiTrendingUp />}
          label="New"
          value={stats.newLeads}
          right={<Badge>30d</Badge>}
        />
        <Stat
          icon={<FiTarget />}
          label="Active"
          value={stats.activeLeads}
          right={<Badge>open</Badge>}
        />
        <Stat
          icon={<FiBox />}
          label="Inventory"
          value={stats.inventory}
          right={<Badge>items</Badge>}
        />
      </div>

      {/* Panels (still stubbed; next steps will wire real data) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-5">
        <Panel title="Recent Activities">
          {acts.length === 0 ? (
            <ListItem text="No recent activity" />
          ) : acts.map((ev) => (
            <ListItem key={ev.id} text={`${ev.type} on lead ${ev.lead_id.slice(0,6)}…`} tag={new Date(ev.created_at).toLocaleTimeString()} />
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
      </div>

      <QuickTaskModal open={quickOpen} onClose={()=> setQuickOpen(false)} onCreated={()=>{
        // reload upcoming quickly
        listUpcomingTasksTenant({ limit: 6 }).then(setUpcoming).catch(()=>{});
      }}/>
    </div>
  );
}
