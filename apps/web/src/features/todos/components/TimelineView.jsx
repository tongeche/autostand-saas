import React, { useMemo } from "react";
import { formatShortDate } from "./shared";

export default function TimelineView({ tasks = [], leads = {} }){
  const groups = useMemo(()=> groupByDate(tasks), [tasks]);
  const days = Object.keys(groups).sort();
  if (days.length === 0) return <div className="text-sm text-slate-500">No tasks</div>;
  return (
    <div className="space-y-4">
      {days.map(d => (
        <section key={d} className="">
          <div className="text-xs font-medium text-slate-700 mb-2">{pretty(d)}</div>
          <div className="space-y-2">
            {groups[d].map(t => (
              <div key={t.id} className="bg-white rounded-2xl shadow p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{t.title || '(untitled)'}</div>
                  <div className="text-xs text-slate-600">{leads[t.lead_id]?.name || t.lead_id}</div>
                </div>
                <div className="text-xs text-slate-600">{(t.status||'open').replace('_',' ')}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function groupByDate(tasks){
  const map = {};
  for (const t of tasks||[]){
    const d = (t.due_date ? new Date(t.due_date).toISOString().slice(0,10) : 'No date');
    (map[d] ||= []).push(t);
  }
  return map;
}

function pretty(yyyy_mm_dd){
  if (yyyy_mm_dd === 'No date') return 'No date';
  try { return formatShortDate(new Date(yyyy_mm_dd)); } catch { return yyyy_mm_dd; }
}
