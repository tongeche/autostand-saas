import React from "react";
import { FiClock, FiCheckCircle } from "react-icons/fi";
import { ucFirst, formatShortDate } from "./shared";

const COLUMNS = [
  { key: "open",        title: "To‑do",       tone: { dot:"bg-amber-500", chip:"bg-amber-100 text-amber-700" } },
  { key: "in_progress", title: "On Progress", tone: { dot:"bg-indigo-500", chip:"bg-indigo-100 text-indigo-700" } },
  { key: "in_review",   title: "In Review",   tone: { dot:"bg-purple-500", chip:"bg-purple-100 text-purple-700" } },
  { key: "done",        title: "Completed",   tone: { dot:"bg-emerald-600", chip:"bg-emerald-100 text-emerald-700" } },
];

export default function KanbanBoard({ tasks = [], leads = {}, onMove }){
  const grouped = groupByStatus(tasks);
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
      {COLUMNS.map(col => (
        <Column key={col.key} colKey={col.key} title={col.title} tone={col.tone} tasks={grouped[col.key] || []} leads={leads} onMove={onMove} />
      ))}
    </div>
  );
}

function Column({ colKey, title, tone, tasks, leads, onMove }){
  return (
    <section
      className="bg-white rounded-2xl shadow-sm"
      onDragOver={(e)=> e.preventDefault()}
      onDrop={(e)=>{
        const id = e.dataTransfer.getData('text/task');
        if (id && onMove) onMove(id, colKey);
      }}
    >
      <header className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className={`inline-block h-2 w-2 rounded-full ${tone.dot}`} />
          <span>{title}</span>
          <span className="text-xs text-slate-500">{tasks.length}</span>
        </div>
      </header>
      <div className="p-3 space-y-3 min-h-[120px]">
        {tasks.length === 0 ? (
          <div className="text-xs text-slate-500">No tasks</div>
        ) : tasks.map(t => (
          <Card key={t.id} task={t} lead={leads[t.lead_id]} tone={tone} />
        ))}
      </div>
    </section>
  );
}

function Card({ task, lead, tone }){
  const due = task.due_date ? new Date(task.due_date) : null;
  const dueTxt = due ? due.toLocaleDateString() : "—";
  const priorityTone = toneForPriority(task.priority);
  return (
    <article
      className="rounded-2xl p-3 bg-white shadow hover:shadow-md transition-shadow"
      draggable
      onDragStart={(e)=> e.dataTransfer.setData('text/task', task.id)}
    >
      <div className="flex items-center gap-2 mb-2">
        {lead ? (
          <span className="text-[11px] px-2 py-0.5 bg-[color:var(--color-surface)] text-slate-700 rounded-full">
            {lead.name || lead.plate || "Lead"}
          </span>
        ) : null}
        {task.priority ? (
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${priorityTone.bg} ${priorityTone.fg}`}>{ucFirst(task.priority)}</span>
        ) : null}
      </div>
      <div className="font-medium mb-1 truncate" title={task.title}>{task.title || "(untitled)"}</div>
      {task.description ? (
        <div className="text-xs text-slate-600 line-clamp-2">{task.description}</div>
      ) : null}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
        <div className="inline-flex items-center gap-1">
          {task.status === 'done' ? <FiCheckCircle className="text-emerald-600"/> : <FiClock className="text-slate-500"/>}
          <span>{due ? formatShortDate(due) : '—'}</span>
        </div>
        <div className="inline-flex items-center gap-1">
          {/* assignee badge placeholder (show raw id tail) */}
          {task.assignee_id ? (
            <span className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px]" title={task.assignee_id}>
              {task.assignee_id.slice(0,2).toUpperCase()}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function groupByStatus(tasks){
  const map = { open: [], in_progress: [], in_review: [], done: [] };
  for (const t of tasks || []){
    const k = (t.status || 'open').toLowerCase();
    if (map[k]) map[k].push(t); else map.open.push(t);
  }
  return map;
}

function toneForPriority(p){
  const key = (p||'').toLowerCase();
  if (key === 'high') return { bg: 'bg-red-100', fg: 'text-red-700' };
  if (key === 'medium') return { bg: 'bg-amber-100', fg: 'text-amber-700' };
  if (key === 'low') return { bg: 'bg-sky-100', fg: 'text-sky-700' };
  return { bg: 'bg-slate-100', fg: 'text-slate-700' };
}

function uc(s){ return String(s||'').replace(/\b\w/g, c=>c.toUpperCase()); }
