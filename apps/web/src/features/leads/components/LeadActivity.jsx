import React from "react";
export default function LeadActivity({ lead }){
  const acts = lead.activities || [];
  if(!acts.length) return <div className="text-sm text-slate-500">No activity.</div>;
  return (
    <div className="divide-y">
      {acts.slice(0,20).map(a=>(
        <div key={a.id} className="py-2">
          <div className="text-sm font-medium capitalize">{a.type.replace("_"," ")}</div>
          {a.data?.summary && <div className="text-xs text-slate-600">{a.data.summary}</div>}
          <div className="text-[11px] text-slate-400">{new Date(a.ts).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}
