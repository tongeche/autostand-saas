import React, { useMemo, useState } from "react";
import { formatShortDate } from "./shared";
import { FiClock, FiCheckCircle } from "react-icons/fi";

export default function TimelineView({ tasks = [], leads = {} }){
  const [mode, setMode] = useState('day'); // 'day' | 'week'
  const groups = useMemo(()=> mode==='day' ? groupByDate(tasks) : groupByWeek(tasks), [tasks, mode]);
  const keys = Object.keys(groups).sort();
  if (keys.length === 0) return <div className="text-sm text-slate-500">No tasks</div>;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <div className="inline-flex rounded-xl border border-gray-200 bg-white overflow-hidden text-xs">
          <button className={`px-3 py-1 ${mode==='day' ? 'bg-slate-900 text-white' : ''}`} onClick={()=> setMode('day')}>Day</button>
          <button className={`px-3 py-1 ${mode==='week' ? 'bg-slate-900 text-white' : ''}`} onClick={()=> setMode('week')}>Week</button>
        </div>
      </div>
      {mode==='day' ? (
        keys.map(d => (
          <DaySection key={d} label={d} tasks={groups[d]} leads={leads} />
        ))
      ) : (
        keys.map(ws => (
          <WeekSection key={ws} weekStart={ws} tasks={groups[ws]} leads={leads} />
        ))
      )}
    </div>
  );
}

function DaySection({ label, tasks, leads }){
  const { dow, day, nice } = useMemo(()=> parseDayLabel(label), [label]);
  return (
    <section className="rounded-2xl bg-white shadow-sm p-4">
      {/* Header: day block + divider */}
      <div className="flex items-center gap-3">
        <div className="w-12 shrink-0 text-center">
          <div className="uppercase text-[11px] text-slate-600 font-semibold">{dow}</div>
          <div className="text-lg font-semibold text-slate-900">{day}</div>
        </div>
        <div className="flex-1 h-px bg-slate-200"/>
        <div className="hidden sm:block text-xs text-slate-500">{nice}</div>
        <div className="shrink-0">
          <button className="px-2 py-1 rounded-lg border border-gray-200 text-xs bg-white"
            onClick={()=> openQuickTask(label)}
          >+ New Task</button>
        </div>
      </div>

      {/* Vertical timeline */}
      <div className="relative mt-3">
        <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px bg-slate-200"/>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tasks.map((t) => (
            <TimelineItem key={t.id} task={t} lead={leads[t.lead_id]} />
          ))}
        </div>
      </div>
    </section>
  );
}

function WeekSection({ weekStart, tasks, leads }){
  const start = new Date(weekStart);
  const end = new Date(start); end.setDate(start.getDate()+6);
  const title = `Week of ${formatShortDate(start)} — ${formatShortDate(end)}`;
  return (
    <section className="rounded-2xl bg-white shadow-sm p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-800">{title}</div>
        <button className="px-2 py-1 rounded-lg border border-gray-200 text-xs bg-white"
          onClick={()=> openQuickTask(weekStart)}
        >+ New Task</button>
      </div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {tasks.map(t => (
          <TimelineItem key={t.id} task={t} lead={leads[t.lead_id]} />
        ))}
      </div>
    </section>
  );
}

function TimelineItem({ task, lead }){
  const tone = colorTone(task);
  const dueTime = task.due_date ? new Date(task.due_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
  return (
    <div className="relative pl-12 sm:pl-14">
      <span className={`absolute left-[22px] sm:left-8 top-3 h-2.5 w-2.5 rounded-full ${tone.dot}`}/>
      <div className={`rounded-xl px-3 py-2 pr-4 ${tone.bg} ${tone.ring} flex items-center justify-between gap-3`}>        
        <div className="min-w-0">
          <div className={`text-sm font-medium ${tone.text} truncate`}>{task.title || '(untitled)'}</div>
          <div className="text-xs text-slate-600 truncate">{lead?.name || '—'}{dueTime ? ` • ${dueTime}` : ''}</div>
        </div>
        <div className={`shrink-0 inline-flex items-center gap-1 text-xs ${tone.text}`}>
          {task.status === 'done' ? <FiCheckCircle/> : <FiClock/>}
          <span>{(task.status||'open').replace('_',' ')}</span>
        </div>
      </div>
    </div>
  );
}

function colorTone(task){
  const status = String(task?.status || '').toLowerCase();
  const pr = String(task?.priority || 'normal').toLowerCase();
  let key = 'indigo';
  if (status === 'done') key = 'green';
  else if (pr === 'high') key = 'orange';
  else if (pr === 'low') key = 'cyan';
  const map = {
    indigo: { bg: 'bg-indigo-50', ring: 'ring-1 ring-indigo-200', dot: 'bg-indigo-400', text: 'text-indigo-700' },
    orange: { bg: 'bg-orange-50', ring: 'ring-1 ring-orange-200', dot: 'bg-orange-400', text: 'text-orange-700' },
    green:  { bg: 'bg-emerald-50', ring: 'ring-1 ring-emerald-200', dot: 'bg-emerald-400', text: 'text-emerald-700' },
    cyan:   { bg: 'bg-cyan-50', ring: 'ring-1 ring-cyan-200', dot: 'bg-cyan-400', text: 'text-cyan-700' },
  };
  return map[key] || map.indigo;
}

function groupByDate(tasks){
  const map = {};
  for (const t of tasks||[]){
    const d = (t.due_date ? new Date(t.due_date).toISOString().slice(0,10) : 'No date');
    (map[d] ||= []).push(t);
  }
  return map;
}

function groupByWeek(tasks){
  const map = {};
  for (const t of tasks||[]){
    const d = t.due_date ? weekStartISO(new Date(t.due_date)) : 'No date';
    (map[d] ||= []).push(t);
  }
  return map;
}

function parseDayLabel(yyyy_mm_dd){
  if (yyyy_mm_dd === 'No date') return { dow: '—', day: '', nice: 'No date' };
  const d = new Date(yyyy_mm_dd);
  const dow = d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
  const day = d.getDate();
  const nice = formatShortDate(d);
  return { dow, day, nice };
}

function weekStartISO(d){
  const x = new Date(d); const day = x.getDay(); // 0..6, 0=Sun
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  x.setDate(x.getDate() + diff);
  x.setHours(0,0,0,0);
  return x.toISOString().slice(0,10);
}

function openQuickTask(dateStr){
  try{
    if (!dateStr || dateStr==='No date'){
      window.dispatchEvent(new CustomEvent('autostand:open_quick_task', { detail: { title: '', due: null } }));
      return;
    }
    const due = new Date(`${dateStr}T10:00:00`);
    window.dispatchEvent(new CustomEvent('autostand:open_quick_task', { detail: { title: '', due } }));
  }catch{}
}
