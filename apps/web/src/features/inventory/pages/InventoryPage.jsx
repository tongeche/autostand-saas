import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiSearch, FiUpload, FiDownload, FiMoreHorizontal, FiEdit2, FiArchive, FiTrash2, FiX } from "react-icons/fi";
import InventoryCsvImportModal from "../components/InventoryCsvImportModal.jsx";
import { insertCarsCsvStaging, listCars, updateCar, deleteCar, archiveCar, upsertCarsNormalized } from "../services/cars";
import { listGeneralItems, upsertGeneralItemsFromCsv } from "../services/general";
import { supabase } from "../../../lib/supabase";

export default function InventoryPage(){
  const location = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [biz, setBiz] = useState('cars');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [status, setStatus] = useState('all');
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  async function loadFromDb(){
    try { setLoading(true); setErr(null);
      // Load business type for current org
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      let bt = 'cars';
      if (uid){
        const { data: ms } = await supabase.from('org_members').select('org_id').eq('user_id', uid).limit(1);
        const orgId = ms && ms[0]?.org_id;
        if (orgId){
          const { data: s } = await supabase.from('org_settings').select('business_type').eq('org_id', orgId).maybeSingle();
          bt = s?.business_type || 'cars';
        }
      }
      setBiz(bt);
      if (bt === 'cars'){
        // Use real cars table for robust actions (edit/delete/archive)
        const { rows: raw } = await listCars({ q: q || '' });
        const mapped = raw.map(mapCarRow);
        setRows(mapped);
      } else {
        const { rows: items } = await listGeneralItems({ q });
        setRows(items);
      }
    } catch(e){ setErr(e.message || String(e)); }
    finally { setLoading(false); }
  }

  const filtered = useMemo(()=> rows
    .filter(r => !q.trim() || (
      (r.plate||'').toLowerCase().includes(q.toLowerCase()) ||
      (r.brand||'').toLowerCase().includes(q.toLowerCase()) ||
      (r.model||'').toLowerCase().includes(q.toLowerCase()) ||
      (r.name||'').toLowerCase().includes(q.toLowerCase()) ||
      (r.sku||'').toLowerCase().includes(q.toLowerCase())
    ))
    .filter(r => {
      if (status === 'all') return true;
      const s = biz==='cars' ? mapVehicleStatus(r.status) : generalStockFromQty(r.quantity);
      return String(s) === String(status);
    })
  , [q, rows, status, biz]);

  // Limit table display to 10 rows; search still matches full dataset
  const display = useMemo(()=> filtered.slice(0, 10), [filtered]);

  // On mount, read URL params (?q= & import=1)
  useEffect(()=>{
    const params = new URLSearchParams(location.search);
    const qp = params.get('q');
    const imp = params.get('import');
    if (qp){ setQ(qp); }
    if (imp === '1'){ setImportOpen(true); }
    // initial load
    loadFromDb();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh when external actions occur
  useEffect(()=>{
    const fn = ()=> loadFromDb();
    window.addEventListener('inventory:changed', fn);
    return ()=> window.removeEventListener('inventory:changed', fn);
  }, []);

  return (
    <div className="w-full space-y-3">
      {/* Main content */}
      <section className="space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold">Inventory</div>
          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg border bg-white inline-flex items-center gap-2 text-sm" onClick={()=> setImportOpen(true)}><FiUpload/> Import</button>
            <button className="px-3 py-2 rounded-lg border bg-white inline-flex items-center gap-2 text-sm"><FiDownload/> Export</button>
            <button className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm">+ Add Product</button>
          </div>
          {/* Mobile actions: primary + overflow */}
          <div className="md:hidden flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm">+ Add</button>
            <HeaderActions onImport={()=> setImportOpen(true)} onExport={()=> { /* TODO: export */ }} />
          </div>
        </div>

        {/* Metrics (computed) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-slate-600 text-sm">{biz === 'cars' ? 'Total vehicles' : 'Total items'}</div>
            <div className="text-3xl font-semibold mt-1">{rows.length.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-slate-600 text-sm">Average price</div>
            <div className="text-3xl font-semibold mt-1">
              {biz === 'cars' ? avgMoney(rows.map(r=> r.price || 0)) : avgMoney(rows.map(r=> r.price))}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-slate-600 text-sm">Status</div>
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-600 flex-wrap">
              {biz === 'cars' ? (
                <>
                  <Legend dot="bg-emerald-500" label="In stock" value={rows.filter(r=> mapVehicleStatus(r.status)==='in_stock').length}/>
                  <Legend dot="bg-amber-400" label="Low stock" value={rows.filter(r=> mapVehicleStatus(r.status)==='low_stock').length}/>
                  <Legend dot="bg-red-500" label="Out" value={rows.filter(r=> mapVehicleStatus(r.status)==='out_of_stock').length}/>
                </>
              ) : (
                <>
                  <Legend dot="bg-emerald-500" label="In stock" value={rows.filter(r=> (Number(r.quantity)||0) > 5).length}/>
                  <Legend dot="bg-amber-400" label="Low stock" value={rows.filter(r=> (Number(r.quantity)||0) > 0 && (Number(r.quantity)||0) <= 5).length}/>
                  <Legend dot="bg-red-500" label="Out" value={rows.filter(r=> (Number(r.quantity)||0) === 0).length}/>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 bg-white w-full sm:w-auto min-w-0">
              <FiSearch className="text-slate-500" />
              <input className="outline-none text-sm min-w-0 w-full sm:w-64" placeholder="Search"
                value={q}
                onChange={(e)=> setQ(e.target.value)}
                onKeyDown={(e)=>{ if (e.key==='Enter') loadFromDb(); }} />
            </div>
            {/* Status filter */}
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 bg-white">
              <span className="text-slate-500 text-sm">Status</span>
              <select className="text-sm outline-none bg-transparent" value={status} onChange={(e)=> setStatus(e.target.value)}>
                <option value="all">All</option>
                <option value="in_stock">in_stock</option>
                <option value="low_stock">low_stock</option>
                <option value="out_of_stock">out_of_stock</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <button className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm" onClick={()=> loadFromDb()}>Refresh</button>
          </div>
        </div>

        {/* Desktop table (cars simplified columns) */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-sm">
              <tr>
                <Th className="w-10"></Th>
                {biz === 'cars' ? (
                  <>
                    <Th>Matrícula</Th>
                    <Th>Marca</Th>
                    <Th>Modelo</Th>
                    <Th>Estado</Th>
                    <Th className="text-right">Despesas</Th>
                    <Th className="w-10 text-right">Ação</Th>
                  </>
                ) : (
                  <>
                    <Th>Item</Th>
                    <Th>SKU</Th>
                    <Th className="text-right">Qty</Th>
                    <Th className="text-right">Price</Th>
                    <Th>Status</Th>
                    <Th>Category</Th>
                    <Th className="w-10 text-right">Ação</Th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {display.map((r, idx)=> (
                <tr
                  key={r.id || idx}
                  className="border-t border-gray-200 odd:bg-white even:bg-slate-50 hover:bg-slate-50 cursor-pointer"
                  onClick={(e)=>{ if (biz==='cars' && !e.target.closest('[data-row-actions]')) { setEditing(r); setEditOpen(true); } }}
                  tabIndex={0}
                  onKeyDown={(e)=>{ if (biz==='cars' && e.key==='Enter') { setEditing(r); setEditOpen(true); } }}
                >
                  <td className="px-3 py-3"><input type="checkbox"/></td>
                  {biz === 'cars' ? (
                    <>
                      <td className="px-3 py-3 text-sm">{r.plate || '—'}</td>
                      <td className="px-3 py-3 text-sm">{r.brand || '—'}</td>
                      <td className="px-3 py-3 text-sm">{r.model || '—'}</td>
                      <td className="px-3 py-3">{statusPill(mapVehicleStatus(r.status))}</td>
                      <td className="px-3 py-3 text-right text-sm">{money(r.expenses)}</td>
                      <td className="px-3 py-3 text-right">
                        <RowActions onEdit={()=> { setEditing(r); setEditOpen(true); }} onArchive={async()=> handleArchive(r)} onDelete={async()=> handleDelete(r)} />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-3 text-sm">{r.name || '—'}</td>
                      <td className="px-3 py-3 text-sm">{r.sku || '—'}</td>
                      <td className="px-3 py-3 text-right text-sm">{num(r.quantity)}</td>
                      <td className="px-3 py-3 text-right text-sm">{money(r.price)}</td>
                      <td className="px-3 py-3 text-sm">{statusPill(generalStockFromQty(r.quantity))}</td>
                      <td className="px-3 py-3 text-sm">{r.category || '—'}</td>
                      <td className="px-3 py-3 text-right"><RowActions disabled /></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked list (cars) */}
        {biz === 'cars' && (
          <div className="md:hidden grid grid-cols-1 gap-2">
            {display.map((r, idx)=> (
              <div
                key={r.id || idx}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 cursor-pointer"
                onClick={(e)=>{ if (!e.target.closest('[data-row-actions]')) { setEditing(r); setEditOpen(true); } }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{r.plate || '—'}</div>
                    <div className="text-sm text-slate-600">{r.brand || '—'}</div>
                    <div className="mt-1">{statusPill(mapVehicleStatus(r.status))}</div>
                  </div>
                  <RowActions onEdit={()=> { setEditing(r); setEditOpen(true); }} onArchive={async()=> handleArchive(r)} onDelete={async()=> handleDelete(r)} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination / footer */}
        <div className="flex items-center justify-between p-3 text-sm">
          <div className="inline-flex items-center gap-3">
            <span>{filtered.length.toLocaleString()} results</span>
            {loading && <span className="text-slate-500">loading…</span>}
            {err && <span className="text-red-600">{err}</span>}
          </div>
          <div className="flex items-center gap-1 opacity-50">
            <button className="px-2 py-1 rounded border bg-white" disabled>‹ Previous</button>
            <button className="px-2 py-1 rounded border bg-white" disabled>Next ›</button>
          </div>
        </div>
      </section>
      <InventoryCsvImportModal
        open={importOpen}
        onClose={()=> setImportOpen(false)}
        onImport={async ({ headers, rows: raw })=>{
          // Expect CSV headers to match the Portuguese labels below
          const H = indexHeaders(headers);
          const next = raw.map(r => ({
            available_to: pick(r,H,'Disponibilizado a'),
            plate: pick(r,H,'Matrícula'),
            brand: pick(r,H,'Marca'),
            model: pick(r,H,'Modelo'),
            version: pick(r,H,'Versão'),
            first_reg: pick(r,H,'Data da primeira matrícula'),
            first_reg_pt: pick(r,H,'Data da primeira matrícula em Portugal (para importados)'),
            days_in_stock: num(pick(r,H,'Dias em Stock')),
            status: pick(r,H,'Estado'),
            cc: num(pick(r,H,'Cilindrada')),
            hp: num(pick(r,H,'Potência')),
            km: num(pick(r,H,'KM')),
            fuel: pick(r,H,'Combustível'),
            expenses: num(pick(r,H,'Despesas')),
            sale_price: num(pick(r,H,'Preço de Venda')),
            vat_regime: pick(r,H,'Regime de IVA'),
            purchase_price: num(pick(r,H,'Preço de Compra')),
            total_with_expenses: num(pick(r,H,'Total com Despesas')),
          }));
          try {
            setLoading(true); setErr(null);
            if (biz === 'cars'){
              // 1) Save raw CSV into staging (exact headers)
              await insertCarsCsvStaging(headers, raw);
              // 2) Upsert into cars table using normalized mapping
              const mappedForDb = next.map(r=> ({
                plate: r.plate,
                brand: r.brand,
                make: r.brand,
                model: r.model,
                version: r.version,
                first_reg: r.first_reg,
                km: r.km,
                fuel: r.fuel,
                sale_price: r.sale_price,
                total_with_expenses: r.total_with_expenses,
                status: r.status,
              }));
              const res = await upsertCarsNormalized(mappedForDb);
              await loadFromDb();
              alert(`Imported ${raw.length} rows (cars: ${res.inserted} new, ${res.updated} updated)`);
            } else {
              // General inventory CSV: expect headers [name, sku, quantity, price, status, category]
              const res = await upsertGeneralItemsFromCsv(headers, raw);
              await loadFromDb();
              alert(`Imported ${res.inserted} general items`);
            }
          } catch(e){
            setErr(e.message || String(e));
            alert(`Import failed: ${e?.message || e}`);
          } finally { setLoading(false); setImportOpen(false); }
        }}
      />
      {/* Edit modal */}
      <EditCarModal open={editOpen} car={editing} onClose={()=> { setEditOpen(false); setEditing(null); }} onSaved={()=> { setEditOpen(false); setEditing(null); loadFromDb(); }} />
    </div>
  );
}

function Th({ children, className }){
  return <th className={`px-3 py-2 border-b border-gray-200 ${className||''}`}>{children}</th>;
}

function Legend({ dot, label, value }){
  return (
    <div className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`}/>
      <span>{label}: {value}</span>
    </div>
  );
}

function statusPill(status){
  const map = {
    'in_stock': 'bg-emerald-100 text-emerald-700',
    'low_stock': 'bg-amber-100 text-amber-700',
    'out_of_stock': 'bg-red-100 text-red-700'
  };
  const tone = map[status] || 'bg-slate-100 text-slate-700';
  const label = status?.replaceAll('_',' ') || 'unknown';
  return <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${tone}`}><span className="h-1.5 w-1.5 rounded-full bg-current"/> {label}</span>
}

function mapVehicleStatus(s){
  const t = (s||'').toLowerCase();
  if (t.includes('stock') || t.includes('dispon')) return 'in_stock';
  if (t.includes('low') || t.includes('baixo')) return 'low_stock';
  if (t.includes('out') || t.includes('esgot')) return 'out_of_stock';
  return 'in_stock';
}

// For general inventory, derive stock status from quantity
function generalStockFromQty(qty){
  const n = Number(qty||0);
  if (n <= 0) return 'out_of_stock';
  if (n <= 5) return 'low_stock';
  return 'in_stock';
}

function indexHeaders(hdrs){
  const map = {};
  hdrs.forEach((h,i)=>{ map[h.trim().toLowerCase()] = i; });
  return map;
}
function pick(row, H, label){ const i = H[label.trim().toLowerCase()]; return i!=null ? row[i] : ''; }
function num(x){ const n = Number(String(x||'').replace(/[^0-9.-]/g,'')); return isNaN(n) ? 0 : n; }
function money(x){ const n = num(x); return n ? `€${n.toLocaleString()}` : '—'; }

function mapStagingRow(r){
  // Map exact-header row to normalized keys expected by UI
  const g = (k) => r[k] ?? '';
  return {
    id: r.id,
    available_to: g('Disponibilizado a'),
    plate: g('Matrícula'),
    brand: g('Marca'),
    model: g('Modelo'),
    version: g('Versão'),
    first_reg: g('Data da primeira matrícula'),
    first_reg_pt: g('Data da primeira matrícula em Portugal (para importados)'),
    days_in_stock: num(g('Dias em Stock')),
    status: g('Estado'),
    cc: num(g('Cilindrada')),
    hp: num(g('Potência')),
    km: num(g('KM')),
    fuel: g('Combustível'),
    expenses: num(g('Despesas')),
    sale_price: num(g('Preço de Venda')),
    vat_regime: g('Regime de IVA'),
    purchase_price: num(g('Preço de Compra')),
    total_with_expenses: num(g('Total com Despesas')),
  };
}



function avgMoney(arr){
  const nums = (arr||[]).map(x=> num(x)).filter(n=> n>0);
  if (!nums.length) return '—';
  const avg = Math.round(nums.reduce((a,b)=> a+b, 0) / nums.length);
  return `€${avg.toLocaleString()}`;
}

// Map row from cars table to normalized keys expected by UI
function mapCarRow(r){
  return {
    id: r.id,
    plate: r.plate || '',
    brand: r.make || r.brand || '',
    model: r.model || '',
    status: r.status || 'in_stock',
    price: r.price || 0,
    // cars table does not have expenses; default to 0 to render '—'
    expenses: 0,
  };
}

function RowActions({ onEdit, onArchive, onDelete, disabled }){
  const [open, setOpen] = React.useState(false);
  React.useEffect(()=>{
    if (!open) return;
    const onDown = (e)=>{ if (!e.target.closest?.('[data-row-actions]')) setOpen(false); };
    const onKey = (e)=>{ if (e.key==='Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return ()=> { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div className="relative inline-block" data-row-actions>
      <button className="icon-btn" disabled={disabled} onClick={()=> setOpen(v=>!v)} title="Ação"><FiMoreHorizontal/></button>
      {open && !disabled && (
        <div className="absolute right-0 mt-1 w-40 bg-white border rounded-xl shadow-lg overflow-hidden z-10">
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 inline-flex items-center gap-2" onClick={()=>{ setOpen(false); onEdit?.(); }}><FiEdit2/> Editar</button>
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 inline-flex items-center gap-2" onClick={()=>{ setOpen(false); onArchive?.(); }}><FiArchive/> Arquivar</button>
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-red-600 inline-flex items-center gap-2" onClick={()=>{ setOpen(false); onDelete?.(); }}><FiTrash2/> Eliminar</button>
        </div>
      )}
    </div>
  );
}

function HeaderActions({ onImport, onExport }){
  const [open, setOpen] = React.useState(false);
  React.useEffect(()=>{
    if (!open) return;
    const onDown = (e)=>{ if (!e.target.closest?.('[data-header-actions]')) setOpen(false); };
    const onKey = (e)=>{ if (e.key==='Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return ()=> { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div className="relative" data-header-actions>
      <button className="icon-btn" onClick={()=> setOpen(v=>!v)} title="More"><FiMoreHorizontal/></button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 inline-flex items-center gap-2" onClick={()=>{ setOpen(false); onImport?.(); }}><FiUpload/> Import CSV</button>
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 inline-flex items-center gap-2" onClick={()=>{ setOpen(false); onExport?.(); }}><FiDownload/> Export</button>
        </div>
      )}
    </div>
  );
}

function EditCarModal({ open, car, onClose, onSaved }){
  const [vals, setVals] = React.useState({ plate: '', brand: '', model: '', status: 'in_stock', price: '' });
  const [busy, setBusy] = React.useState(false);
  React.useEffect(()=>{
    if (open && car){ setVals({ plate: car.plate||'', brand: car.brand||'', model: car.model||'', status: car.status||'in_stock', price: car.price||'' }); }
  }, [open, car]);
  if (!open) return null;
  async function save(){
    try{
      if (!car?.id) return onClose?.();
      setBusy(true);
      // Note: brand maps to make in DB
      await updateCar(car.id, { plate: vals.plate, make: vals.brand, model: vals.model, status: vals.status, price: vals.price });
      onSaved?.();
    } catch(e){ alert(e?.message || String(e)); }
    finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-[90] bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-medium">Editar Veículo</div>
          <button className="icon-btn" onClick={onClose}><FiX/></button>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div>
            <div className="text-slate-600 mb-1">Matrícula</div>
            <input className="input w-full" value={vals.plate} onChange={(e)=> setVals(v=>({ ...v, plate: e.target.value }))} />
          </div>
          <div>
            <div className="text-slate-600 mb-1">Marca</div>
            <input className="input w-full" value={vals.brand} onChange={(e)=> setVals(v=>({ ...v, brand: e.target.value }))} />
          </div>
          <div>
            <div className="text-slate-600 mb-1">Modelo</div>
            <input className="input w-full" value={vals.model} onChange={(e)=> setVals(v=>({ ...v, model: e.target.value }))} />
          </div>
          <div>
            <div className="text-slate-600 mb-1">Estado</div>
            <select className="input w-full" value={vals.status} onChange={(e)=> setVals(v=>({ ...v, status: e.target.value }))}>
              <option value="in_stock">in_stock</option>
              <option value="low_stock">low_stock</option>
              <option value="out_of_stock">out_of_stock</option>
              <option value="archived">archived</option>
            </select>
          </div>
          <div>
            <div className="text-slate-600 mb-1">Preço</div>
            <input className="input w-full" value={vals.price} onChange={(e)=> setVals(v=>({ ...v, price: e.target.value }))} />
          </div>
        </div>
        <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
          <button className="px-3 py-2 rounded border" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="px-3 py-2 rounded bg-gray-900 text-white" onClick={save} disabled={busy}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

async function handleArchive(r){
  try{ await archiveCar(r.id, true); alert('Archived'); window.dispatchEvent(new Event('inventory:changed')); } catch(e){ alert(e?.message || String(e)); }
}
async function handleDelete(r){
  if (!window.confirm('Delete this vehicle?')) return;
  try{ await deleteCar(r.id); alert('Deleted'); window.dispatchEvent(new Event('inventory:changed')); } catch(e){ alert(e?.message || String(e)); }
}
