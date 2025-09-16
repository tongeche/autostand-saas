import React, { useEffect, useState } from "react";
import TemplateWizard from "../../wall/components/TemplateWizard.jsx";
import { supabase } from "../../../lib/supabase";

export default function TemplatesPage(){
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");

  async function load(){
    try{
      setErr("");
      const { data, error } = await supabase
        .from('templates')
        .select('id,name,category,channel,subject')
        .order('name', { ascending:true });
      if (error) throw error;
      setRows(data||[]);
    }catch(e){ setErr(e.message || String(e)); }
  }

  useEffect(()=>{ load(); }, []);

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xl font-semibold">Templates</div>
          <div className="text-sm text-slate-600">Create and reuse templates to send to leads or clients.</div>
        </div>
        <button className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm" onClick={()=> setOpen(true)}>+ New Template</button>
      </div>

      {err && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{err}</div>}

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2 w-64">Name</th>
              <th className="text-left px-3 py-2 w-40">Category</th>
              <th className="text-left px-3 py-2 w-32">Channel</th>
              <th className="text-left px-3 py-2">Subject</th>
            </tr>
          </thead>
          <tbody>
            {(!rows || rows.length===0) ? (
              <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>No templates yet</td></tr>
            ) : rows.map(t => (
              <tr key={t.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium truncate">{t.name}</td>
                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{t.category || '—'}</td>
                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{t.channel || '—'}</td>
                <td className="px-3 py-2 text-slate-600 truncate">{t.subject || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {(!rows || rows.length===0) ? (
          <div className="text-sm text-slate-500">No templates yet</div>
        ) : rows.map(t => (
          <div key={t.id} className="bg-white rounded-xl border p-3">
            <div className="font-medium">{t.name}</div>
            <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div><span className="text-slate-500">Category:</span> {t.category || '—'}</div>
              <div><span className="text-slate-500">Channel:</span> {t.channel || '—'}</div>
              <div className="col-span-2"><span className="text-slate-500">Subject:</span> {t.subject || '—'}</div>
            </div>
          </div>
        ))}
      </div>

      <TemplateWizard open={open} onClose={()=> setOpen(false)} onCreated={()=> { setOpen(false); load(); }} />
    </div>
  );
}
