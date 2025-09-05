import React from "react";
import { FiClock, FiCheckCircle } from "react-icons/fi";
import { formatShortDate } from "./shared";

export default function ListView({ tasks = [], leads = {} }){
  if (!tasks || tasks.length === 0) return <div className="text-sm text-slate-500">No tasks</div>;
  return (
    <div className="space-y-2">
      {tasks.map(t => (
        <div key={t.id} className="bg-white rounded-2xl shadow p-3 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{t.title || '(untitled)'}</div>
            <div className="text-xs text-slate-600 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-[color:var(--color-surface)]">{leads[t.lead_id]?.name || t.lead_id}</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100">{(t.status||'open').replace('_',' ')}</span>
            </div>
          </div>
          <div className="text-xs text-slate-600 inline-flex items-center gap-2">
            {t.status === 'done' ? <FiCheckCircle className="text-emerald-600"/> : <FiClock className="text-slate-500"/>}
            <span>{t.due_date ? formatShortDate(t.due_date) : '—'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
