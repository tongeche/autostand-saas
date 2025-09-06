import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiSearch, FiUpload, FiDownload, FiMoreHorizontal } from "react-icons/fi";
import InventoryCsvImportModal from "../components/InventoryCsvImportModal.jsx";
import { insertCarsCsvStaging, listCarsStaging } from "../services/cars";

export default function InventoryPage(){
  const location = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function loadFromDb(){
    try { setLoading(true); setErr(null);
      // Load from staging table and map to normalized fields used in UI
      const { rows: raw } = await listCarsStaging({});
      const mapped = raw.map(mapStagingRow);
      setRows(mapped);
    } catch(e){ setErr(e.message || String(e)); }
    finally { setLoading(false); }
  }

  const filtered = useMemo(()=> rows.filter(r => !q.trim() || (
    (r.plate||'').toLowerCase().includes(q.toLowerCase()) ||
    (r.brand||'').toLowerCase().includes(q.toLowerCase()) ||
    (r.model||'').toLowerCase().includes(q.toLowerCase())
  )), [q, rows]);

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

  return (
    <div className="w-full space-y-3">
      {/* Main content */}
      <section className="space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold">Inventory</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg border bg-white inline-flex items-center gap-2 text-sm" onClick={()=> setImportOpen(true)}><FiUpload/> Import CSV</button>
            <button className="px-3 py-2 rounded-lg border bg-white inline-flex items-center gap-2 text-sm"><FiDownload/> Export</button>
            <button className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm">+ Add Product</button>
          </div>
        </div>

        {/* Metrics (computed) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-slate-600 text-sm">Total vehicles</div>
            <div className="text-3xl font-semibold mt-1">{rows.length.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-slate-600 text-sm">Average price</div>
            <div className="text-3xl font-semibold mt-1">{avgMoney(rows.map(r=> r.sale_price || r.total_with_expenses))}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-slate-600 text-sm">Status</div>
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-600 flex-wrap">
              <Legend dot="bg-emerald-500" label="In stock" value={rows.filter(r=> mapVehicleStatus(r.status)==='in_stock').length}/>
              <Legend dot="bg-amber-400" label="Low stock" value={rows.filter(r=> mapVehicleStatus(r.status)==='low_stock').length}/>
              <Legend dot="bg-red-500" label="Out" value={rows.filter(r=> mapVehicleStatus(r.status)==='out_of_stock').length}/>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl border shadow-sm p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2 bg-white">
              <FiSearch className="text-slate-500" />
              <input className="outline-none text-sm min-w-[180px]" placeholder="Search" value={q} onChange={(e)=> setQ(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') loadFromDb(); }} />
            </div>
            <button className="px-3 py-2 rounded-lg border bg-white text-sm">12 Sep – 28 Oct 2024</button>
            <button className="px-3 py-2 rounded-lg border bg-white text-sm">Amount Status ▾</button>
            <button className="px-3 py-2 rounded-lg border bg-white text-sm">Status ▾</button>
            <button className="px-3 py-2 rounded-lg border bg-white text-sm">Filter</button>
          </div>
        </div>

        {/* Vehicles Table with selected headers (hide non-queried columns) */}
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-sm">
              <tr>
                <Th className="w-10"></Th>
                <Th>Disponibilizado a</Th>
                <Th>Matrícula</Th>
                <Th>Marca</Th>
                <Th>Modelo</Th>
                <Th>Versão</Th>
                <Th className="text-right">Dias em Stock</Th>
                <Th>Estado</Th>
                <Th className="text-right">Cilindrada</Th>
                <Th className="text-right">Potência</Th>
                <Th className="text-right">KM</Th>
                <Th>Combustível</Th>
                <Th className="text-right">Despesas</Th>
                <Th className="text-right">Total com Despesas</Th>
                <Th className="w-10 text-right">Ação</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx)=> (
                <tr key={idx} className="border-t">
                  <td className="px-3 py-3"><input type="checkbox"/></td>
                  <td className="px-3 py-3 text-sm">{r.available_to || '—'}</td>
                  <td className="px-3 py-3 text-sm">{r.plate || '—'}</td>
                  <td className="px-3 py-3 text-sm">{r.brand || '—'}</td>
                  <td className="px-3 py-3 text-sm">{r.model || '—'}</td>
                  <td className="px-3 py-3 text-sm">{r.version || '—'}</td>
                  <td className="px-3 py-3 text-right text-sm">{num(r.days_in_stock)}</td>
                  <td className="px-3 py-3">{statusPill(mapVehicleStatus(r.status))}</td>
                  <td className="px-3 py-3 text-right text-sm">{num(r.cc)}</td>
                  <td className="px-3 py-3 text-right text-sm">{num(r.hp)}</td>
                  <td className="px-3 py-3 text-right text-sm">{num(r.km)}</td>
                  <td className="px-3 py-3 text-sm">{r.fuel || '—'}</td>
                  <td className="px-3 py-3 text-right text-sm">{money(r.expenses)}</td>
                  <td className="px-3 py-3 text-right text-sm">{money(r.total_with_expenses)}</td>
                  <td className="px-3 py-3 text-right"><button className="icon-btn"><FiMoreHorizontal/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="flex items-center justify-between p-3 border-t text-sm">
            <div className="inline-flex items-center gap-3">
              <span>Result 1–10 of {rows.length || 0}</span>
              {loading && <span className="text-slate-500">loading…</span>}
              {err && <span className="text-red-600">{err}</span>}
            </div>
          <div className="flex items-center gap-1">
              <button className="px-2 py-1 rounded border bg-white">‹ Previous</button>
              <button className="px-2 py-1 rounded border bg-indigo-600 text-white">1</button>
              <button className="px-2 py-1 rounded border bg-white">2</button>
              <button className="px-2 py-1 rounded border bg-white">3</button>
              <span className="px-2">…</span>
              <button className="px-2 py-1 rounded border bg-white">12</button>
              <button className="px-2 py-1 rounded border bg-white">Next ›</button>
            </div>
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
            // Save raw CSV into staging with exact headers (all text)
            await insertCarsCsvStaging(headers, raw);
            // Display data from staging
            await loadFromDb();
            alert(`Imported ${raw.length} rows into staging`);
          } catch(e){
            setErr(e.message || String(e));
            alert(`Import failed: ${e?.message || e}`);
          } finally { setLoading(false); setImportOpen(false); }
        }}
      />
    </div>
  );
}

function Th({ children, className }){
  return <th className={`px-3 py-2 ${className||''}`}>{children}</th>;
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
