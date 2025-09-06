import React from "react";
import { FiClock, FiCheckCircle, FiList, FiPlayCircle, FiEye, FiPlus, FiMessageSquare, FiPaperclip } from "react-icons/fi";
import { ucFirst, formatShortDate } from "./shared";

const COLUMNS = [
  { key: "open",        title: "To‑do",       icon: FiList,       tone: { dot:"bg-amber-500",  chip:"bg-amber-100 text-amber-700",  headBg:"bg-amber-50",  headRing:"ring-amber-200",  headText:"text-amber-700" } },
  { key: "in_progress", title: "On Progress", icon: FiPlayCircle, tone: { dot:"bg-indigo-500", chip:"bg-indigo-100 text-indigo-700", headBg:"bg-indigo-50", headRing:"ring-indigo-200", headText:"text-indigo-700" } },
  { key: "in_review",   title: "In Review",   icon: FiEye,        tone: { dot:"bg-purple-500", chip:"bg-purple-100 text-purple-700", headBg:"bg-purple-50", headRing:"ring-purple-200", headText:"text-purple-700" } },
  { key: "done",        title: "Completed",   icon: FiCheckCircle, tone: { dot:"bg-emerald-600", chip:"bg-emerald-100 text-emerald-700", headBg:"bg-emerald-50", headRing:"ring-emerald-200", headText:"text-emerald-700" } },
];

export default function KanbanBoard({ tasks = [], leads = {}, onMove }){
  const grouped = groupByStatus(tasks);
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
      {COLUMNS.map(col => (
        <Column key={col.key} colKey={col.key} title={col.title} tone={col.tone} icon={col.icon} tasks={grouped[col.key] || []} leads={leads} onMove={onMove} />
      ))}
    </div>
  );
}

function Column({ colKey, title, tone, tasks, leads, onMove, icon: Icon }){
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
        <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-xl ring-1 ${tone.headRing} ${tone.headBg} ${tone.headText} text-sm font-medium`}>
          {Icon ? <Icon /> : <span className={`inline-block h-2 w-2 rounded-full ${tone.dot}`} />}
          <span>{title}</span>
          <span className="text-[11px] bg-white/60 text-current rounded-full px-2 py-0.5">{tasks.length}</span>
        </div>
        <button className="icon-btn text-xs" title="New task"
          onClick={()=> window.dispatchEvent(new CustomEvent('autostand:open_quick_task', { detail: { title: '', due: null } }))}
        ><FiPlus/></button>
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
  const labels = Array.isArray(task.labels) ? task.labels : (task.category ? [task.category] : []);
  const assignees = Array.isArray(task.assignees) ? task.assignees : (task.assignee_id ? [task.assignee_id] : []);
  const comments = Number(task.comments_count || task.comments || 0) || 0;
  const attachments = Number(task.attachments_count || task.attachments || 0) || 0;
  return (
    <article
      className="rounded-2xl p-3 bg-white shadow hover:shadow-md transition-shadow"
      draggable
      onDragStart={(e)=> e.dataTransfer.setData('text/task', task.id)}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {lead ? (
          <span className="text-[11px] px-2 py-0.5 bg-[color:var(--color-surface)] text-slate-700 rounded-full">
            {lead.name || lead.plate || "Lead"}
          </span>
        ) : null}
        {labels.map((lbl, i)=>{
          const lt = toneForLabel(lbl, i);
          return <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full ${lt.bg} ${lt.fg}`}>{lbl}</span>;
        })}
        {task.priority ? (
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${priorityTone.bg} ${priorityTone.fg}`}>{ucFirst(task.priority)}</span>
        ) : null}
      </div>
      <div className="font-medium mb-1 truncate" title={task.title}>{task.title || "(untitled)"}</div>
      {task.description ? (
        <div className="text-xs text-slate-600 line-clamp-2">{task.description}</div>
      ) : null}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
        <div className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1"><FiMessageSquare className="text-slate-500"/> {comments}</span>
          <span className="inline-flex items-center gap-1"><FiPaperclip className="text-slate-500"/> {attachments}</span>
          <span className="inline-flex items-center gap-1">
            {task.status === 'done' ? <FiCheckCircle className="text-emerald-600"/> : <FiClock className="text-slate-500"/>}
            <span>{due ? formatShortDate(due) : '—'}</span>
          </span>
        </div>
        <AvatarGroup users={assignees} />
      </div>
    </article>
  );
}

function AvatarGroup({ users = [] }){
  if (!users || users.length === 0) return null;
  const max = 3;
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((u, i)=> {
        const { bg, fg } = toneForAvatar(u, i);
        const init = initials(u);
        return (
          <span key={i} className={`h-6 w-6 rounded-full ${bg} ${fg} ring-2 ring-white flex items-center justify-center text-[10px]`}
            title={u}
          >{init}</span>
        );
      })}
      {extra > 0 && (
        <span className="h-6 w-6 rounded-full bg-slate-200 text-slate-700 ring-2 ring-white flex items-center justify-center text-[10px]">+{extra}</span>
      )}
    </div>
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

function toneForLabel(label, seed=0){
  const colors = [
    { bg:'bg-sky-100', fg:'text-sky-700' },
    { bg:'bg-violet-100', fg:'text-violet-700' },
    { bg:'bg-rose-100', fg:'text-rose-700' },
    { bg:'bg-lime-100', fg:'text-lime-700' },
    { bg:'bg-cyan-100', fg:'text-cyan-700' },
    { bg:'bg-orange-100', fg:'text-orange-700' },
  ];
  const n = (hash(label) + seed) % colors.length;
  return colors[n];
}

function toneForAvatar(id, seed=0){
  const colors = [
    { bg:'bg-slate-800', fg:'text-white' },
    { bg:'bg-indigo-600', fg:'text-white' },
    { bg:'bg-emerald-600', fg:'text-white' },
    { bg:'bg-rose-600', fg:'text-white' },
    { bg:'bg-amber-600', fg:'text-white' },
    { bg:'bg-cyan-600', fg:'text-white' },
  ];
  const n = (hash(id) + seed) % colors.length;
  return colors[n];
}

function initials(s){
  const str = String(s||'').replace(/[^a-zA-Z ]/g,' ').trim();
  if (!str) return 'U';
  const parts = str.split(/\s+/);
  const first = parts[0][0];
  const second = parts.length>1 ? parts[1][0] : '';
  return (first + second).toUpperCase();
}

function hash(s){
  let h = 0; const str = String(s||'');
  for (let i=0; i<str.length; i++){ h = (h<<5) - h + str.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}
