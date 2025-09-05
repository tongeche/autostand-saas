import React, { useMemo, useState } from "react";
import { FiLayers, FiFilePlus, FiEye } from "react-icons/fi";
import DocumentWizard from "../components/DocumentWizard.jsx";
import { useLocation, useNavigate } from "react-router-dom";

// Simple template renderer: {{ key }}
function render(body, ctx){
  const flat = ctx || {};
  return String(body||"").replace(/{{\s*([\w.]+)\s*}}/g, (_,k)=> String(flat[k] ?? ""));
}

const SAMPLE_TEMPLATES = [
  {
    id: 't1', name: 'Vehicle Proposal (PT)',
    body: `Olá {{client.name}},\n\nSegue a proposta para o {{car.make}} {{car.model}} ({{car.plate}}).\nPreço: {{car.price}} €.\n\nCumprimentos,\n{{dealer.name}}`
  },
  {
    id: 't2', name: 'Follow-up (EN)',
    body: `Hello {{client.name}},\n\nJust checking in about the {{car.make}} {{car.model}}.\nLet me know if you want a test drive.\n\nBest,\n{{dealer.name}}`
  }
];

export default function DocumentsPage(){
  const location = useLocation();
  const navigate = useNavigate();
  const [templates] = useState(SAMPLE_TEMPLATES);
  const [tplId, setTplId] = useState(templates[0].id);
  const [title, setTitle] = useState("Untitled Document");
  const [body, setBody] = useState(templates[0].body);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [docType, setDocType] = useState('text');
  const [showTemplates, setShowTemplates] = useState(false); // mobile toggle

  const baseCtx = useMemo(()=>({
    client: { name: 'Cliente' },
    car: { plate:'AA-00-AA', make:'Volkswagen', model:'Golf', price:'17 900' },
    dealer: { name:'AutoStand' }
  }), []);
  const [docCtx, setDocCtx] = useState(baseCtx);

  function applyTemplate(id){
    const t = templates.find(x=>x.id===id); if (!t) return;
    setTplId(id);
    setBody(t.body);
    setTitle(t.name);
  }

  function openPrint(){
    const html = printableHtml(title, render(body, docCtx), docCtx, docType);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open(); w.document.write(html); w.document.close();
    try { w.focus(); } catch {}
  }

  // Open wizard from URL (?new=car|checklist|blank)
  React.useEffect(()=>{
    const params = new URLSearchParams(location.search);
    const kind = params.get('new');
    if (kind){
      setWizardOpen(true);
      setDocType(kind);
      // cleanup query param after opening
      const next = new URLSearchParams(location.search); next.delete('new');
      navigate({ search: next.toString() }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xl font-semibold truncate">Documents</div>
          <div className="text-sm text-slate-600 hidden sm:block">Create documents, templates, and ready‑to‑send PDFs for clients.</div>
        </div>
        <IconHeaderActions
          onNew={()=> setWizardOpen(true)}
          onReady={()=> applyTemplate('t1')}
          onPreview={openPrint}
        />
      </div>

      {/* Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Templates */}
        <aside className={`lg:col-span-1 bg-white rounded-xl border p-3 ${showTemplates ? '' : 'hidden'} lg:block`}>
          <div className="font-medium mb-2">Templates</div>
          <div className="space-y-2">
            {templates.map(t => (
              <button key={t.id} onClick={()=>applyTemplate(t.id)}
                className={`w-full text-left px-3 py-2 rounded-lg border ${tplId===t.id?'bg-accent/40 border-accent':'bg-white'}`}
              >{t.name}</button>
            ))}
          </div>
          <div className="text-xs text-slate-600 mt-3">Coming soon: manage your own templates, variables and branding.</div>
        </aside>

        {/* Editor */}
        <section className="lg:col-span-2 bg-white rounded-xl border p-3 space-y-3">
          {/* Mobile templates toggle */}
          <div className="flex items-center justify-between lg:hidden">
            <button className="text-sm px-2 py-1 rounded border bg-white" onClick={()=> setShowTemplates(v=>!v)}>
              {showTemplates ? 'Hide templates' : 'Show templates'}
            </button>
          </div>
          <label className="block text-sm">
            <div className="text-slate-600 mb-1">Title</div>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={title} onChange={(e)=>setTitle(e.target.value)} />
          </label>
          <label className="block text-sm">
            <div className="text-slate-600 mb-1">Body</div>
            <textarea className="w-full h-72 rounded-lg border px-3 py-2 text-sm font-mono" value={body} onChange={(e)=>setBody(e.target.value)} />
          </label>
          <div className="text-xs text-slate-600">Available tags: {"{{client.name}}"}, {"{{car.plate}}"}, {"{{car.make}}"}, {"{{car.model}}"}, {"{{car.price}}"}, {"{{dealer.name}}"}</div>
        </section>
      </div>
      <DocumentWizard initialType={docType} open={wizardOpen} onClose={()=> setWizardOpen(false)} onCreate={({ title, body, ctx, type })=>{ setTitle(title); setBody(body); setDocCtx(ctx ? { ...baseCtx, ...ctx, client: { ...baseCtx.client, ...(ctx.client||{}) }, car: { ...baseCtx.car, ...(ctx.car||{}) }, dealer: { ...baseCtx.dealer, ...(ctx.dealer||{}) } } : baseCtx); setDocType(type || 'text'); setWizardOpen(false); }} />
    </div>
  );
}

function printableHtml(title, content, ctx, docType){
  const safe = (s)=> String(s||"").replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br/>');
  const header = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:16px;border-radius:12px;background:#f5f6f8;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:28px;font-weight:800;color:#d72626;">auto</span>
        <span style="font-size:28px;font-weight:800;color:#111;">trust</span>
      </div>
      <div style="text-align:right;font-size:12px;color:#111">
        <div style="font-weight:600;margin-bottom:4px">Autotrust</div>
        <div>Rua Augusto Simões 259</div>
        <div>4470-147 Maia</div>
        <div style="margin-top:6px">915907470</div>
        <div>geral@autotrust.pt</div>
      </div>
    </div>`;
  // Vehicle spec block if context provided
  const spec = (function(){
    const c = (ctx&&ctx.car) || {};
    const rows = [
      ['Veículo', [c.make,c.model,c.version].filter(Boolean).join(' ')],
      ['Matrícula', c.plate||''],
      ['Data de Registo', c.first_reg||''],
      ['Kms', c.km ? String(c.km).replace(/\B(?=(\d{3})+(?!\d))/g,' ') : ''],
      ['Cor', c.color||''],
      ['Combustível', c.fuel||''],
      ['Cilindrada', c.cc ? `${c.cc} cc` : ''],
      ['Potência', c.hp ? `${c.hp} cv` : ''],
    ];
    const visible = rows.filter(([k,v]) => String(v||'').trim().length);
    if (!visible.length) return '';
    return `<div style="margin-top:16px;border-top:1px solid #e5e7eb;padding-top:12px;">
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px 16px;">
        ${visible.map(([k,v])=>`<div><div style=\"color:#64748b;font-size:12px\">${safe(k)}</div><div style=\"font-weight:600\">${safe(v)}</div></div>`).join('')}
      </div>
    </div>`;
  })();

  // Checklist block (Portuguese) — vertical sections
  const checklist = (function(){
    if (docType !== 'checklist') return '';
    return `
    <div style="margin-top:16px">
      <h2 style="font-size:14px;margin:0 0 8px">Registo de Entrada</h2>
      <div>Data de chegada ao stand: ________________________ &nbsp;&nbsp; Responsável: ________________________</div>

      <h2 style="font-size:14px;margin:16px 0 8px">Estado Comercial</h2>
      <div>${box()} Disponível (pronto a vender)</div>
      <div>${box()} Reservado (sinal tomado)</div>
      <div>${box()} Em preparação (lavagem, oficina, fotos)</div>
      <div>${box()} Vendido (aguarda entrega / entregue)</div>
      <div>${box()} Devolvido / Cancelado</div>

      <h2 style="font-size:14px;margin:16px 0 8px">Preparação Mecânica / Visual</h2>
      <div>${box()} Lavagem e detalhe</div>
      <div>${box()} Pneus verificados</div>
      <div>${box()} Revisão (óleo / fluidos / filtros)</div>
      <div>${box()} Inspeção de segurança realizada</div>
      <div>${box()} Pronto para test‑drive</div>

      <h2 style="font-size:14px;margin:16px 0 8px">Marketing / Listagem</h2>
      <div>${box()} Fotografias e vídeos</div>
      <div>${box()} Dados inseridos no OnePilot</div>
      <div>${box()} Anúncios exportados (Standvirtual / PiscaPisca)</div>
      <div>${box()} Publicação em redes sociais</div>
      <div>${box()} Ficha de viatura preparada</div>
      <div>${box()} Preço confirmado e carregado</div>

      <h2 style="font-size:14px;margin:16px 0 8px">Documentação</h2>
      <div>${box()} Documentos inseridos / verificados</div>

      <h2 style="font-size:14px;margin:16px 0 8px">Notas</h2>
      <div style="border:1px dashed #cbd5e1;border-radius:8px;min-height:80px;padding:8px;color:#475569">Observações…</div>
    </div>`;
  })();

  return `<!doctype html><html><head><meta charset=\"utf-8\"/><title>${safe(title)}</title>
  <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:24px;color:#111}
  h1{margin:0 0 12px;font-size:20px}
  .muted{color:#64748b;font-size:12px;margin-top:24px}
  .text{white-space:pre-wrap;margin-top:16px}
  </style></head><body>
  ${header}
  <h1>${safe(title)}</h1>
  ${spec}
  ${checklist}
  <div class=\"text\">${safe(content)}</div>
  <div class=\"muted\">Generated by Documents</div>
  </body></html>`;

  function box(){ return `<span style=\"display:inline-block;width:12px;height:12px;border:1px solid #94a3b8;border-radius:2px;vertical-align:middle;margin-right:6px\"></span>`; }
}

function HeaderActions({ onNew, onReady, onPreview }){
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button className="px-3 py-2 rounded-lg border bg-white text-sm" onClick={onReady}>Generate Ready Templates</button>
        <button className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm" onClick={()=> setOpen(v=>!v)}>Create ▼</button>
        <button className="px-3 py-2 rounded-lg border bg-white text-sm" onClick={onPreview}>Preview / PDF</button>
      </div>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border z-10">
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={()=>{ setOpen(false); onNew?.('blank'); }}>Blank Document</button>
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={()=>{ setOpen(false); onNew?.('checklist'); }}>Checklist</button>
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={()=>{ setOpen(false); onNew?.('car'); }}>Car Document</button>
        </div>
      )}
    </div>
  );
}

// Icon-only header actions (mobile friendly)
function IconHeaderActions({ onNew, onReady, onPreview }){
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex items-center gap-1">
      <button title="Generate templates" aria-label="Generate templates" className="icon-btn !h-10 !w-10" onClick={onReady}>
        <FiLayers />
      </button>
      <button title="Create" aria-label="Create" className="icon-btn !h-10 !w-10" onClick={()=> setOpen(v=>!v)}>
        <FiFilePlus />
      </button>
      <button title="Preview / PDF" aria-label="Preview" className="icon-btn !h-10 !w-10" onClick={onPreview}>
        <FiEye />
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-48 bg-white rounded-xl shadow-lg border z-20">
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={()=>{ setOpen(false); onNew?.('blank'); }}>Blank</button>
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={()=>{ setOpen(false); onNew?.('checklist'); }}>Checklist</button>
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={()=>{ setOpen(false); onNew?.('car'); }}>Car Doc</button>
        </div>
      )}
    </div>
  );
}
