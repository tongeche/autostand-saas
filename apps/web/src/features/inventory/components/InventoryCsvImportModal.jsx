import React, { useEffect, useMemo, useRef, useState } from "react";

// Very small CSV parser that handles quotes and commas
function parseCsv(text){
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  while (i < text.length){
    const c = text[i];
    if (inQuotes){
      if (c === '"'){
        if (text[i+1] === '"'){ field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    } else {
      if (c === '"'){ inQuotes = true; i++; continue; }
      if (c === ','){ row.push(field.trim()); field=''; i++; continue; }
      if (c === '\n' || c === '\r'){
        // finish row on first newline; skip CRLF extra char
        row.push(field.trim()); field='';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
        // skip following newline in CRLF
        if (c === '\r' && text[i+1] === '\n') i += 2; else i++;
        continue;
      }
      field += c; i++; continue;
    }
  }
  // push last
  if (field.length || row.length){ row.push(field.trim()); rows.push(row); }
  return rows;
}

export default function InventoryCsvImportModal({ open, onClose, onImport }){
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);

  // Auto-open file picker when modal opens (enhances 1-click import flow)
  useEffect(()=>{ if (open) setTimeout(()=> fileRef.current?.click(), 0); }, [open]);

  async function onPickFile(e){
    setErr(null);
    try{
      const f = e.target.files?.[0];
      if (!f) return;
      setFileName(f.name);
      const text = await f.text();
      const matrix = parseCsv(text);
      if (!matrix || matrix.length === 0) throw new Error('Empty CSV');
      const hdr = matrix[0];
      const data = matrix.slice(1).filter(r => r.some(x=>x && x.length));
      setHeaders(hdr);
      setRows(data);
    }catch(ex){ setErr(ex.message || String(ex)); }
  }

  const preview = useMemo(()=> rows.slice(0, 10), [rows]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/30 flex items-start justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-medium">Import CSV</div>
          <button className="px-3 py-1.5 rounded border" onClick={onClose}>Close</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-sm">Upload a CSV with the exact headers. We will show a quick preview (first 10 rows).</div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onPickFile} className="hidden" />
            <button className="px-3 py-2 rounded-lg border bg-white text-sm" onClick={()=> fileRef.current?.click()}>Select CSV…</button>
            {fileName && <span className="text-xs text-slate-600">{fileName}</span>}
          </div>
          {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{err}</div>}
          {headers.length > 0 && (
            <div className="overflow-auto border rounded-xl">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>{headers.map((h,i)=>(<th key={i} className="px-3 py-2 text-left">{h}</th>))}</tr>
                </thead>
                <tbody>
                  {preview.map((r,ri)=>(
                    <tr key={ri} className="border-t">
                      {headers.map((_,ci)=>(<td key={ci} className="px-3 py-1.5">{r[ci]||''}</td>))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <button className="px-3 py-2 rounded border" onClick={onClose}>Cancel</button>
            <button className="px-3 py-2 rounded bg-gray-900 text-white" disabled={!rows.length}
              onClick={()=> onImport?.({ headers, rows })}
            >Import</button>
          </div>
        </div>
      </div>
    </div>
  );
}
