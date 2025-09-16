import React, { useMemo } from "react";

export default function LeadsTimelineView({ leads=[] }){
  const byDay = useMemo(()=> groupByDay(leads), [leads]);
  const days = Object.keys(byDay).sort((a,b)=> new Date(a) - new Date(b));
  return (
    <div className="bg-white rounded-2xl p-3">
      {days.length === 0 ? (
        <div className="text-sm text-slate-500">No leads</div>
      ) : days.map((d)=> (
        <section key={d} className="mb-4">
          <div className="text-xs font-medium text-slate-600 mb-2">{new Date(d).toLocaleDateString(undefined,{ weekday:'short', month:'short', day:'numeric' })}</div>
          <div className="space-y-2">
            {byDay[d].map(l => (
              <div key={l.id} className="rounded-xl border px-3 py-2 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{l.name || l.plate || '(unnamed)'}</div>
                  <div className="text-xs text-slate-600 truncate">{l.status || 'new'}</div>
                </div>
                <div className="text-xs text-slate-500">{new Date(l.updated_at || l.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function groupByDay(leads){
  const map = {};
  for (const l of leads||[]){
    const at = l.updated_at || l.created_at || new Date().toISOString();
    const day = new Date(at).toISOString().slice(0,10);
    (map[day] ||= []).push(l);
  }
  return map;
}

