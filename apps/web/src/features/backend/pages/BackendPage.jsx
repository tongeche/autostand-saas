import React, { useEffect, useMemo, useState } from "react";
import { FaDownload, FaPrint, FaExclamationTriangle } from "react-icons/fa";
import { supabase } from "../../../lib/supabase";

// UI-only sample data for the "Compramos o seu carro" section
const BUY_SAMPLE_ROWS = [
  { id: 'buy1', status: 'new',      client_name: 'João Silva',  make: 'BMW', model: '320d',  plate: 'AA-00-BB', phone: '911 234 567', location: 'Lisboa', created_at: new Date().toISOString() },
  { id: 'buy2', status: 'reviewed', client_name: 'Maria Santos',make: 'VW',  model: 'Golf',  plate: 'CC-11-DD', phone: '934 987 654', location: 'Porto',  created_at: '2025-09-14T11:20:00Z' },
  { id: 'buy3', status: 'approved', client_name: 'Pedro Costa', make: 'Audi',model: 'A3',    plate: 'EE-22-FF', phone: '967 222 333', location: 'Braga',  created_at: '2025-09-12T09:05:00Z' },
];

function BackendPage(){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(null); // row for viewer
  const [menuOpen, setMenuOpen] = useState(null); // id of row whose actions menu is open

  async function load(){
    try{
      setLoading(true); setErr("");
      let query = supabase
        .from('car_intake_requests')
        // Include images so viewer can render them from the car-intake bucket
        .select('id,status,answers,images,created_at,client_name,make,model,owners_count,motive,budget,location,email,agree,pdf_url,notified_at,plate,phone')
        .order('created_at', { ascending:false })
        .limit(200);
      const { data, error } = await query;
      if (error) throw error;
      setRows(data||[]);
    }catch(e){ setErr(e.message || String(e)); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ load(); }, []);
  useEffect(()=>{
    if (!menuOpen) return;
    const onDown = (e) => {
      const anyMenus = document.querySelectorAll('[data-row-actions]');
      let inside = false; anyMenus.forEach(el => { if (el.contains(e.target)) inside = true; });
      if (!inside) setMenuOpen(null);
    };
    document.addEventListener('mousedown', onDown);
    return ()=> document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const filtered = useMemo(()=> (rows||[])
    .filter(r => status==='all' || String(r.status||'').toLowerCase()===String(status))
    .filter(r => {
      if (!q.trim()) return true;
      const needle = q.toLowerCase();
      const hay = [
        r.client_name, r.make, r.model, r.plate, r.phone, r.email, r.location, r.motive, r.budget, r.status, r.id,
        JSON.stringify(r.answers||{})
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(needle);
    })
  , [rows, status, q]);

  const statuses = useMemo(()=>{
    const set = new Set((rows||[]).map(r => (r.status||'new').toLowerCase()));
    return ['all', ...Array.from(set)];
  }, [rows]);

  return (
    <div className="space-y-4 p-4">
      {/* Header + controls: stack on mobile */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xl font-semibold">Backend</div>
          <div className="text-sm text-slate-600">Car intake requests viewer</div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <select className="border rounded px-2 py-2 text-sm" value={status} onChange={(e)=> setStatus(e.target.value)}>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="border rounded px-3 py-2 text-sm min-w-0" placeholder="Search in answers…" value={q} onChange={(e)=> setQ(e.target.value)} />
          <button className="px-3 py-2 rounded-lg border bg-white text-sm" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
        </div>
      </div>

      {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{err}</div>}

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2 w-28">Status</th>
              <th className="text-left px-3 py-2 w-40">Client</th>
              <th className="text-left px-3 py-2">Car</th>
              <th className="text-left px-3 py-2 w-28">Plate</th>
              <th className="text-left px-3 py-2 w-36">Phone</th>
              <th className="text-left px-3 py-2 w-40">Location</th>
              <th className="text-left px-3 py-2 w-28">Budget</th>
              <th className="text-right px-3 py-2 w-48">Created</th>
              <th className="px-3 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td className="px-3 py-3 text-slate-500" colSpan={9}>No intake requests</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2 align-top"><StatusPill value={r.status}/></td>
                <td className="px-3 py-2 align-top whitespace-nowrap">{r.client_name || '—'}</td>
                <td className="px-3 py-2 align-top truncate">{r.make || '—'} {r.model || ''}</td>
                <td className="px-3 py-2 align-top whitespace-nowrap">{r.plate || '—'}</td>
                <td className="px-3 py-2 align-top whitespace-nowrap">{r.phone || '—'}</td>
                <td className="px-3 py-2 align-top truncate">{r.location || '—'}</td>
                <td className="px-3 py-2 align-top whitespace-nowrap">{r.budget || '—'}</td>
                <td className="px-3 py-2 text-right align-top whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</td>
                <td className="px-3 py-2 text-right align-top">
                  <div className="relative inline-flex items-center gap-2" data-row-actions>
                    <button className="px-2 py-1 rounded border text-xs" onClick={()=> setOpen(r)}>View</button>
                    <button className="px-2 py-1 rounded border text-xs" onClick={()=> setMenuOpen(prev => prev===r.id ? null : r.id)}>…</button>
                    {menuOpen === r.id && (
                      <div className="absolute right-0 top-8 w-40 bg-white rounded-lg border shadow-lg z-10">
                        <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={()=> { setMenuOpen(null); handleDownloadZip(r); }}>Download ZIP</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 ? (
          <div className="text-sm text-slate-500">No intake requests</div>
        ) : (
          filtered.map(r => (
            <div key={r.id} className="bg-white rounded-xl border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusPill value={r.status}/>
                    <div className="font-medium">{r.client_name || '—'}</div>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">{r.make || '—'} {r.model || ''}{r.plate ? ` • ${r.plate}` : ''}</div>
                </div>
                <div className="text-[11px] text-slate-500 whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div><span className="text-slate-500">Phone:</span> {r.phone || '—'}</div>
                <div><span className="text-slate-500">Budget:</span> {r.budget || '—'}</div>
                <div className="col-span-2"><span className="text-slate-500">Location:</span> {r.location || '—'}</div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2" data-row-actions>
                <button className="px-2 py-1 rounded border text-xs" onClick={()=> setOpen(r)}>View</button>
                <div className="relative">
                  <button className="px-2 py-1 rounded border text-xs" onClick={()=> setMenuOpen(prev => prev===r.id ? null : r.id)}>…</button>
                  {menuOpen === r.id && (
                    <div className="absolute right-0 top-8 w-40 bg-white rounded-lg border shadow-lg z-10">
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={()=> { setMenuOpen(null); handleDownloadZip(r); }}>Download ZIP</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <IntakeViewer row={open} onClose={()=> setOpen(null)} />

      {/* --- "Compramos o seu carro" section (UI only) --- */}
      <div className="pt-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between mb-2">
          <div>
            <div className="text-lg font-semibold">Compramos o seu carro</div>
            <div className="text-sm text-slate-600">Leads from the “sell your car” form (UI only)</div>
          </div>
        </div>

        {/* Sample rows (replace with fetch later) */}
        {/* Desktop table */}
        <div className="hidden md:block bg-white rounded-2xl border overflow-hidden">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2 w-28">Status</th>
                <th className="text-left px-3 py-2 w-40">Client</th>
                <th className="text-left px-3 py-2">Car</th>
                <th className="text-left px-3 py-2 w-28">Plate</th>
                <th className="text-left px-3 py-2 w-36">Phone</th>
                <th className="text-left px-3 py-2 w-40">Location</th>
                <th className="text-right px-3 py-2 w-48">Created</th>
                <th className="px-3 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {BUY_SAMPLE_ROWS.length === 0 ? (
                <tr><td className="px-3 py-3 text-slate-500" colSpan={8}>No leads</td></tr>
              ) : BUY_SAMPLE_ROWS.map(r => (
                <tr key={r.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="px-3 py-2 align-top"><StatusPill value={r.status}/></td>
                  <td className="px-3 py-2 align-top whitespace-nowrap">{r.client_name || '—'}</td>
                  <td className="px-3 py-2 align-top truncate">{r.make || '—'} {r.model || ''}</td>
                  <td className="px-3 py-2 align-top whitespace-nowrap">{r.plate || '—'}</td>
                  <td className="px-3 py-2 align-top whitespace-nowrap">{r.phone || '—'}</td>
                  <td className="px-3 py-2 align-top truncate">{r.location || '—'}</td>
                  <td className="px-3 py-2 text-right align-top whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</td>
                  <td className="px-3 py-2 text-right align-top">
                    <div className="relative inline-flex items-center gap-2" data-row-actions>
                      <button className="px-2 py-1 rounded border text-xs" onClick={()=> setOpen(r)}>View</button>
                      <button className="px-2 py-1 rounded border text-xs" onClick={()=> setMenuOpen(prev => prev===r.id ? null : r.id)}>…</button>
                      {menuOpen === r.id && (
                        <div className="absolute right-0 top-8 w-44 bg-white rounded-lg border shadow-lg z-10">
                          <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={()=> { setMenuOpen(null); handleBuyAction(r, 'review'); }}>Mark reviewed</button>
                          <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={()=> { setMenuOpen(null); handleBuyAction(r, 'archive'); }}>Archive</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {BUY_SAMPLE_ROWS.length === 0 ? (
            <div className="text-sm text-slate-500">No leads</div>
          ) : BUY_SAMPLE_ROWS.map(r => (
            <div key={r.id} className="bg-white rounded-xl border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusPill value={r.status}/>
                    <div className="font-medium">{r.client_name || '—'}</div>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">{r.make || '—'} {r.model || ''}{r.plate ? ` • ${r.plate}` : ''}</div>
                </div>
                <div className="text-[11px] text-slate-500 whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div><span className="text-slate-500">Phone:</span> {r.phone || '—'}</div>
                <div className="col-span-2"><span className="text-slate-500">Location:</span> {r.location || '—'}</div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2" data-row-actions>
                <button className="px-2 py-1 rounded border text-xs" onClick={()=> setOpen(r)}>View</button>
                <div className="relative">
                  <button className="px-2 py-1 rounded border text-xs" onClick={()=> setMenuOpen(prev => prev===r.id ? null : r.id)}>…</button>
                  {menuOpen === r.id && (
                    <div className="absolute right-0 top-8 w-44 bg-white rounded-lg border shadow-lg z-10">
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={()=> { setMenuOpen(null); handleBuyAction(r, 'review'); }}>Mark reviewed</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={()=> { setMenuOpen(null); handleBuyAction(r, 'archive'); }}>Archive</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BackendPage;

function handleDownloadZip(row){
  try{
    const url = `/.netlify/functions/intake-zip`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, answers: row.answers, images: row.images || [], pdf_url: row.pdf_url || null })
    }).then(async (res)=>{
      if (!res.ok){ const txt = await res.text().catch(()=> ''); throw new Error(`${res.status} ${txt}`); }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `intake-${row.id.slice(0,8)}.zip`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=> URL.revokeObjectURL(a.href), 5000);
    }).catch((e)=> alert(e?.message || 'Download failed'));
  }catch(e){ alert('Download failed'); }
}

// Download helper for cross-origin images via blob
async function downloadImage(url, filename='image.jpg'){
  try{
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=> URL.revokeObjectURL(a.href), 5000);
  }catch(e){
    alert('Download failed');
  }
}

// UI-only actions for the buy-leads section
function handleBuyAction(row, action){
  try{
    const label = action === 'review' ? 'Marked as reviewed' : action === 'archive' ? 'Archived' : 'Action applied';
    alert(`${label} (UI only) for ${row.client_name || row.id}`);
  }catch{}
}

function StatusPill({ value }){
  const v = String(value||'new').toLowerCase();
  const map = {
    new: ['bg-amber-100','text-amber-800'],
    reviewed: ['bg-sky-100','text-sky-800'],
    approved: ['bg-emerald-100','text-emerald-800'],
    rejected: ['bg-rose-100','text-rose-800'],
  };
  const tone = map[v] || ['bg-slate-100','text-slate-700'];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${tone[0]} ${tone[1]}`}>{v}</span>;
}

function AnswersSummary({ answers }){
  try{
    const a = answers || {};
    const entries = Object.entries(a).slice(0,4);
    if (entries.length === 0) return <span className="text-slate-500">—</span>;
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {entries.map(([k,v])=> (
          <div key={k} className="text-xs text-slate-700 truncate"><span className="text-slate-500 mr-1">{human(k)}:</span>{String(v)}</div>
        ))}
      </div>
    );
  }catch{ return <span className="text-slate-500">—</span>; }
}

function human(s){ return String(s||'').replace(/[_-]+/g,' ').replace(/\b\w/g, c=>c.toUpperCase()); }

function IntakeViewer({ row, onClose }){
  const [urls, setUrls] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  useEffect(()=>{
    (async ()=>{
      if (!row){ setUrls([]); return; }
      const imgs = Array.isArray(row.images) ? row.images : [];
      const sanitize = (p)=> String(p||'').replace(/^\/+/, '').replace(/^car[_ -]intake\//i, '');
      async function resolveUrl(entry){
        try{
          let path = null;
          if (typeof entry === 'string') path = entry;
          else if (entry && typeof entry === 'object'){
            if (entry.url && /^https?:\/\//i.test(entry.url)) return entry.url; // prefer direct url if present
            path = entry.path || entry.key || entry.name || entry.file || '';
          }
          if (!path) return null;
          if (/^https?:\/\//i.test(path)) return path;
          const key = sanitize(path);
          // Prefer signed URL from the known bucket id 'car-intake'
          const { data: signed } = await supabase.storage.from('car-intake').createSignedUrl(key, 3600).catch(()=>({ data:null }));
          if (signed?.signedUrl) return signed.signedUrl;
          // Fallback to public URL (if bucket is public)
          const pub = supabase.storage.from('car-intake').getPublicUrl(key);
          return pub?.data?.publicUrl || null;
        }catch{ return null; }
      }
      const results = await Promise.all(imgs.map(resolveUrl));
      setUrls(results.filter(Boolean));
    })();
  }, [row]);
  if (!row) return null;
  const a = row.answers || {};
  const created = row.created_at ? new Date(row.created_at).toLocaleString() : '';
  const mainOrder = ['client_name','email','phone','location','budget','make','model','plate','owners_count','motive'];
  const fields = mainOrder
    .map(k => ({ key:k, label: human(k), value: a[k] }))
    .filter(f => f.value !== undefined && f.value !== null && String(f.value) !== '');
  const remaining = Object.entries(a)
    .filter(([k]) => !mainOrder.includes(k))
    .filter(([k,v]) => typeof v !== 'object' || v === null) // avoid huge objects
    .map(([k,v]) => ({ key:k, label: human(k), value: v }));

  function printPdf(){
    try{
      const w = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=768');
      if (!w) { setPopupBlocked(true); return; }
      const title = `Pedido de ${row.client_name || a.client_name || '—'}`;
      const style = `
        <style>
          *{ box-sizing: border-box; }
          body{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, 'Apple Color Emoji','Segoe UI Emoji', 'Segoe UI Symbol'; color:#0f172a; margin:24px; }
          h1{ font-size:22px; margin:0 0 8px; }
          /* meta removed; use cards for date/status */
          .pill{ display:inline-block; font-size:11px; background:#f1f5f9; color:#334155; padding:2px 8px; border-radius:999px; margin-right:6px; }
          .grid{ display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:8px; }
          .card{ border:1px solid #e2e8f0; border-radius:12px; padding:10px; }
          .label{ font-size:10px; color:#64748b; }
          .value{ margin-top:2px; font-weight:600; word-break: break-word; }
          .links .value{ font-weight:400; }
          .links a{ color:#0ea5e9; text-decoration:underline; word-break: break-all; font-size:12px; }
          @media print{ body{ margin:12mm; } }
        </style>`;
      const more = remaining.map(f => (
        `<div class="card"><div class="label">${f.label}</div><div class="value">${String(f.value)}</div></div>`
      )).join('');
      const keyFields = fields.map(f => (
        `<div class="card"><div class="label">${f.label}</div><div class="value">${String(f.value)}</div></div>`
      )).join('');
      const extra = [
        { label: 'Created', value: created || '—' },
        { label: 'Status', value: row.status || '—' },
      ].map(f => (`<div class="card"><div class="label">${f.label}</div><div class="value">${String(f.value)}</div></div>`)).join('');
      const imgLabels = Array.isArray(row.images) ? row.images.map((e, i) => {
        try{
          if (e && typeof e === 'object'){
            const name = e.label || e.name || e.title || e.file || e.key || e.path;
            if (name) return String(name);
          }
        }catch{}
        return i === 0 ? 'Image front' : `Image ${i+1}`;
      }) : urls.map((_, i) => (i === 0 ? 'Image front' : `Image ${i+1}`));
      const linkCards = urls.length
        ? urls.map((u, i) => `<div class="card links"><div class="label">${imgLabels[i] || ('Image ' + (i+1))}</div><div class="value"><a href="${u}" target="_blank" rel="noreferrer">${u}</a></div></div>`).join('')
        : `<div class="card links"><div class="label">Imagens (links)</div><div class="value">—</div></div>`;
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${style}</head><body>
        <h1>${title}</h1>
        <div class="grid">${extra}${keyFields}</div>
        ${remaining.length ? `<h2 style="font-size:16px;margin:16px 0 8px;">More details</h2><div class="grid">${more}</div>`:''}
        <div class="grid" style="margin-top:12px;">${linkCards}</div>
        <script>window.addEventListener('load',()=>{ setTimeout(()=>{ window.print(); }, 200); });</script>
      </body></html>`);
      w.document.close();
    }catch(e){ setPopupBlocked(true); }
  }

  function printPdfNoPopup(){
    try{
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (!doc) throw new Error('iframe failed');
      doc.open();
      // reuse the same HTML
      const title = `Pedido de ${row.client_name || a.client_name || '—'}`;
      const style = `
        <style>
          *{ box-sizing: border-box; }
          body{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, 'Apple Color Emoji','Segoe UI Emoji', 'Segoe UI Symbol'; color:#0f172a; margin:24px; }
          h1{ font-size:22px; margin:0 0 8px; }
          /* meta removed; using cards for date/status */
          .pill{ display:inline-block; font-size:11px; background:#f1f5f9; color:#334155; padding:2px 8px; border-radius:999px; margin-right:6px; }
          .grid{ display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:8px; }
          .card{ border:1px solid #e2e8f0; border-radius:12px; padding:10px; }
          .label{ font-size:10px; color:#64748b; }
          .value{ margin-top:2px; font-weight:600; word-break: break-word; }
          .links .value{ font-weight:400; }
          .links a{ color:#0ea5e9; text-decoration:underline; word-break: break-all; font-size:12px; }
          @media print{ body{ margin:12mm; } }
        </style>`;
      const more = remaining.map(f => (
        `<div class="card"><div class="label">${f.label}</div><div class="value">${String(f.value)}</div></div>`
      )).join('');
      const keyFields = fields.map(f => (
        `<div class="card"><div class="label">${f.label}</div><div class="value">${String(f.value)}</div></div>`
      )).join('');
      const extra = [
        { label: 'Created', value: created || '—' },
        { label: 'Status', value: row.status || '—' },
      ].map(f => (`<div class="card"><div class="label">${f.label}</div><div class="value">${String(f.value)}</div></div>`)).join('');
      const imgLabels = Array.isArray(row.images) ? row.images.map((e, i) => {
        try{
          if (e && typeof e === 'object'){
            const name = e.label || e.name || e.title || e.file || e.key || e.path;
            if (name) return String(name);
          }
        }catch{}
        return i === 0 ? 'Image front' : `Image ${i+1}`;
      }) : urls.map((_, i) => (i === 0 ? 'Image front' : `Image ${i+1}`));
      const linkCards = urls.length
        ? urls.map((u, i) => `<div class=\"card links\"><div class=\"label\">${imgLabels[i] || ('Image ' + (i+1))}</div><div class=\"value\"><a href=\"${u}\" target=\"_blank\" rel=\"noreferrer\">${u}</a></div></div>`).join('')
        : `<div class=\"card links\"><div class=\"label\">Imagens (links)</div><div class=\"value\">—</div></div>`;
      doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${style}</head><body>
        <h1>${title}</h1>
        <div class="grid">${extra}${keyFields}</div>
        ${remaining.length ? `<h2 style="font-size:16px;margin:16px 0 8px;">More details</h2><div class="grid">${more}</div>`:''}
        <div class="grid" style="margin-top:12px;">${linkCards}</div>
      </body></html>`);
      doc.close();
      iframe.onload = () => {
        try{ iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }catch{}
        setTimeout(()=> { iframe.remove(); }, 1000);
      };
    }catch(e){ alert('Could not prepare print view'); }
  }
  return (
    <div className="fixed inset-0 z-[90] bg-black/40 flex items-start justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden" onClick={(e)=> e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
          <div className="font-medium">Intake #{row.id.slice(0,8)}</div>
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 rounded border text-xs inline-flex items-center gap-1" onClick={printPdf} title="Print to PDF">
              <FaPrint /> <span>Print PDF</span>
            </button>
            <button className="icon-btn" onClick={onClose}>✕</button>
          </div>
        </div>
        {popupBlocked && (
          <div className="mx-4 mt-3 mb-0 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-3 text-xs flex items-start gap-2">
            <FaExclamationTriangle className="mt-0.5" />
            <div>
              <div className="font-medium">Pop-ups blocked</div>
              <div>Allow pop-ups for this site (click the pop-up blocker icon near the address bar), then click Print again. Or use the fallback below.</div>
              <div className="mt-2 flex items-center gap-2">
                <button className="px-2 py-1 rounded border text-xs" onClick={printPdf}>Try again</button>
                <button className="px-2 py-1 rounded border text-xs" onClick={printPdfNoPopup}>Print without pop-up</button>
              </div>
            </div>
          </div>
        )}
        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-3">
            {/* Meta pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs rounded-full px-2 py-0.5 bg-slate-100 text-slate-700">Created: {created || '—'}</span>
              {row.status && <span className="text-xs rounded-full px-2 py-0.5 bg-amber-100 text-amber-800">Status: {row.status}</span>}
              {row.agree != null && <span className={`text-xs rounded-full px-2 py-0.5 ${row.agree ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>Agree: {String(row.agree)}</span>}
            </div>
            {/* Key fields grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fields.map(f => (
                <div key={f.key} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-[11px] text-slate-500">{f.label}</div>
                  <div className="mt-0.5 font-medium break-words">{String(f.value)}</div>
                </div>
              ))}
            </div>

            {/* Collapsible: remaining fields */}
            {remaining.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="px-3 py-2 flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-700">More details</div>
                  <button className="text-xs underline" onClick={()=> setShowAll(v=>!v)}>{showAll ? 'Hide' : 'Show'}</button>
                </div>
                {showAll && (
                  <div className="px-3 pb-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {remaining.map(f => (
                      <div key={f.key} className="rounded-lg border px-3 py-2">
                        <div className="text-[11px] text-slate-500">{f.label}</div>
                        <div className="mt-0.5 break-words">{String(f.value)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Images */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Images ({urls.length})</div>
            </div>
            {urls.length===0 ? (
              <div className="text-xs text-slate-500">No images</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {urls.map((u,i)=> (
                  <div key={i} className="relative group">
                    <a href={u} target="_blank" rel="noreferrer" className="block">
                      <img src={u} alt={`img-${i}`} className="h-24 w-full object-cover rounded-lg border"/>
                    </a>
                    <button
                      className="absolute right-1.5 top-1.5 p-1 rounded bg-white/90 border shadow-sm text-slate-700 opacity-0 group-hover:opacity-100 transition"
                      title="Download image"
                      onClick={(e)=> { e.preventDefault(); e.stopPropagation(); downloadImage(u, `intake-${row.id.slice(0,8)}-img-${i+1}.jpg`); }}
                    >
                      <FaDownload />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
