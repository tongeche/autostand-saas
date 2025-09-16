import React from "react";
import { FiPhone, FiCheckCircle, FiAward, FiXCircle, FiPlus } from "react-icons/fi";

const COLUMNS = [
  { key: 'new',        title: 'New',        tone: { headBg:'bg-sky-50', headRing:'ring-sky-200', headText:'text-sky-700' } },
  { key: 'contacted',  title: 'Contacted',  tone: { headBg:'bg-violet-50', headRing:'ring-violet-200', headText:'text-violet-700' }, icon: FiPhone },
  { key: 'qualified',  title: 'Qualified',  tone: { headBg:'bg-emerald-50', headRing:'ring-emerald-200', headText:'text-emerald-700' }, icon: FiCheckCircle },
  { key: 'won',        title: 'Won',        tone: { headBg:'bg-amber-50', headRing:'ring-amber-200', headText:'text-amber-700' }, icon: FiAward },
  { key: 'lost',       title: 'Lost',       tone: { headBg:'bg-rose-50', headRing:'ring-rose-200', headText:'text-rose-700' }, icon: FiXCircle },
];

export default function LeadsKanbanBoard({ leads=[], onMove }){
  const grouped = groupByStatus(leads);
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
      {COLUMNS.map(col => (
        <Column key={col.key} col={col} items={grouped[col.key] || []} onDropTo={(id)=> onMove?.(id, col.key)} />
      ))}
    </div>
  );
}

function Column({ col, items, onDropTo }){
  const Icon = col.icon;
  return (
    <section
      className="bg-white rounded-2xl shadow-sm"
      onDragOver={(e)=> e.preventDefault()}
      onDrop={(e)=>{ const id=e.dataTransfer.getData('text/lead'); if (id) onDropTo?.(id); }}
    >
      <header className="px-3 py-2 flex items-center justify-between">
        <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-xl ring-1 ${col.tone.headRing} ${col.tone.headBg} ${col.tone.headText} text-sm font-medium`}>
          {Icon ? <Icon/> : <span className="inline-block h-2 w-2 bg-slate-400 rounded-full"/>}
          <span>{col.title}</span>
          <span className="text-[11px] bg-white/60 text-current rounded-full px-2 py-0.5">{items.length}</span>
        </div>
        <button className="icon-btn text-xs" title="New lead"
          onClick={()=> window.dispatchEvent(new Event('autostand:open_add_lead'))}
        ><FiPlus/></button>
      </header>
      <div className="p-3 space-y-3 min-h-[120px]">
        {items.length === 0 ? (
          <div className="text-xs text-slate-500">No leads</div>
        ) : items.map(l => (
          <Card key={l.id} lead={l} />
        ))}
      </div>
    </section>
  );
}

function Card({ lead }){
  return (
    <article
      className="rounded-2xl p-3 bg-white shadow hover:shadow-md transition-shadow cursor-move"
      draggable
      onDragStart={(e)=> e.dataTransfer.setData('text/lead', lead.id)}
    >
      <div className="font-medium truncate" title={lead.name || lead.plate || lead.id}>{lead.name || lead.plate || '(unnamed)'}</div>
      <div className="mt-1 text-xs text-slate-600 truncate">{lead.phone || lead.email || '—'}</div>
    </article>
  );
}

function groupByStatus(leads){
  const map = { new:[], contacted:[], qualified:[], won:[], lost:[] };
  for (const l of leads||[]){ const k=(l.status||'new').toLowerCase(); if(map[k]) map[k].push(l); else map.new.push(l); }
  return map;
}

