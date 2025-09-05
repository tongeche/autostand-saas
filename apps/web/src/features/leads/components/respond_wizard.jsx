

import React, { useEffect, useMemo, useState } from "react";

function XIcon(props){
  return (
    <svg viewBox="0 0 20 20" width={18} height={18} aria-hidden="true" {...props}>
      <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

/***********************
 * Mocked data stores
 ***********************/
function useLeads(){
  const [leads] = useState([
    {
      id: "lead_1",
      name: "João Silva",
      email: "joao@example.com",
      phone: "+351 912 000 111",
      carId: "car_1",
      carPlate: "AA-12-BB",
      carMake: "Volkswagen",
      carModel: "Golf",
      carVersion: "1.0 TSI",
      carPrice: 17900,
      ownerRole: "Sales",
      ownerName: "Ana"
    }
  ]);
  return {
    getById: (id)=> leads.find(l=>l.id===id) || null
  };
}

function useInventory(){
  const [cars] = useState([
    {
      id: "car_1",
      plate: "AA-12-BB",
      make: "Volkswagen",
      model: "Golf",
      version: "1.0 TSI",
      price: 17900,
      status: "Disponível",
      mileage: 45000,
      fuel: "Gasolina",
      transmission: "Manual",
      color: "Preto",
      year: 2020
    }
  ]);
  return {
    getById: (id)=> cars.find(c=>c.id===id) || null,
    list: ()=> cars
  };
}

function useTodos(){
  return {
    addTask: (t)=>{
      // For demo, just log and toast
      console.log("[todo] created", t);
      alert(`Task created: ${t.title} (due soon)`);
    },
    addDays: (t, n)=> t + n*864e5,
    startOfDay: ()=> Date.now()
  };
}

/***********************
 * Templates API (mock)
 ***********************/
function getTemplates(){
  return [
    {
      id: "t1",
      channel: "email",
      title: "Follow-up: Vehicle details",
      body: `Olá {{lead.name}},\n\nObrigado pelo contacto sobre o {{car.make}} {{car.model}} ({{car.plate}}). Seguem os principais dados:\n- Ano: {{car.year}}\n- Quilómetros: {{car.mileage}}\n- Preço: {{car.price}} €\n\nPosso enviar fotos/vídeo e simulação de financiamento. Fico ao dispor!\n— {{owner.name}}`
    },
    {
      id: "t2",
      channel: "email",
      title: "Proposta e disponibilidade",
      body: `Olá {{lead.name}},\n\nO {{car.make}} {{car.model}} está {{car.status}}. Podemos agendar uma visita/test drive ainda esta semana.\nSe quiser avançar, posso reservar por 48h após sinal.\n\nCumprimentos,\n{{owner.name}} ({{owner.role}})`
    }
  ];
}

function renderTemplate(body, ctx){
  const flat = {
    "lead.name": ctx.lead.name,
    "lead.phone": ctx.lead.phone,
    "lead.email": ctx.lead.email,
    "car.plate": ctx.car.plate,
    "car.make": ctx.car.make,
    "car.model": ctx.car.model,
    "car.version": ctx.car.version,
    "car.price": ctx.car.price,
    "car.status": ctx.car.status,
    "car.mileage": ctx.car.mileage,
    "car.fuel": ctx.car.fuel,
    "car.transmission": ctx.car.transmission,
    "car.color": ctx.car.color,
    "car.year": ctx.car.year,
    "owner.role": ctx.owner.role,
    "owner.name": ctx.owner.name,
  };
  return (body||"").replace(/{{\s*([\w.]+)\s*}}/g, (_, key)=> String(flat[key] ?? ""));
}

/***********************
 * PDF helper (mock)
 ***********************/
function generateProposalPdf(ctx, message){
  // For demo, open a print-friendly view; real app could use jsPDF or server render
  const html = printableHtml(ctx, message);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/***********************
 * RespondWizard (from your spec, slightly adapted to local mocks)
 ***********************/
function RespondWizard({ open, leadId, initialTab="info", onClose }){
  const leads = useLeads();
  const inv = useInventory();
  const todos = useTodos();

  const lead = useMemo(()=> leads.getById?.(leadId) || null, [leads, leadId]);
  const car = useMemo(()=>{
    if (!lead) return null;
    const byId = inv.getById?.(lead.carId);
    if (byId) return byId;
    const list = inv.list ? inv.list() : [];
    const plate = (lead.carPlate||"").toUpperCase();
    return list.find(c => (c.plate||"").toUpperCase() === plate) || null;
  }, [inv, lead]);

  const [tab, setTab] = useState(initialTab || "info");
  const [templateId, setTemplateId] = useState("");
  const [message, setMessage] = useState("");

  const templates = useMemo(()=> getTemplates(), []);
  const infoTemplates = useMemo(()=> templates.filter(t => (t.channel||"") === "email"), [templates]);

  const ctx = useMemo(()=>({
    lead: {
      name: lead?.name || "",
      phone: lead?.phone || "",
      email: lead?.email || ""
    },
    car: {
      plate: lead?.carPlate || car?.plate || "",
      make: lead?.carMake || car?.make || "",
      model: lead?.carModel || car?.model || "",
      version: lead?.carVersion || car?.version || "",
      price: car?.price ?? lead?.carPrice ?? "",
      status: car?.status || lead?.carStatus || "",
      mileage: car?.mileage ?? "",
      fuel: car?.fuel || "",
      transmission: car?.transmission || "",
      color: car?.color || "",
      year: car?.year || ""
    },
    owner: {
      role: lead?.ownerRole || "",
      name: lead?.ownerName || ""
    }
  }), [lead, car]);

  useEffect(()=>{
    if (!open) return;
    const first = infoTemplates[0];
    setTemplateId(first?.id || "");
    setMessage(first ? renderTemplate(first.body, ctx) : "");
    setTab(initialTab || "info");
  }, [open, infoTemplates, ctx, initialTab]);

  function onTemplateChange(id){
    setTemplateId(id);
    const t = templates.find(x=>x.id===id);
    setMessage(t ? renderTemplate(t.body, ctx) : "");
  }

  function copyMessage(){
    try { navigator.clipboard.writeText(message || ""); } catch {}
  }

  function createImagesReminder(){
    if (!lead) return;
    const due = Date.now() + 60*60*1000; // +1h
    todos.addTask?.({
      title: `Send photos: ${ctx.car.plate || [ctx.car.make,ctx.car.model].filter(Boolean).join(" ") || "vehicle"}`,
      due,
      leadId: lead.id,
      leadName: lead.name || "",
      leadPlate: ctx.car.plate || "",
      owner: lead.ownerName || lead.ownerRole || ""
    });
    try {
      window.dispatchEvent(new CustomEvent("autostand:todo:created", { detail: { leadId: lead.id } }));
    } catch {}
    onClose?.();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/30 p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-medium">Respond to Lead</div>
          <button onClick={onClose} className="p-2 rounded border hover:bg-gray-50" aria-label="Close">
            <XIcon />
          </button>
        </div>

        {!lead ? (
          <div className="p-4">Lead not found.</div>
        ) : (
          <div className="p-4 space-y-3">
            {/* Tabs */}
            <div className="flex items-center gap-2">
              <TabBtn label="Info" active={tab==="info"} onClick={()=>setTab("info")} />
              <TabBtn label="Images" active={tab==="images"} onClick={()=>setTab("images")} />
              <TabBtn label="PDF" active={tab==="pdf"} onClick={()=>setTab("pdf")} />
            </div>

            {/* Summary */}
            <div className="border rounded-xl p-3 bg-gray-50 text-sm">
              <div><b>{lead.name || "(no name)"}</b> • {lead.email || "—"} • {lead.phone || "—"}</div>
              {(ctx.car.plate || ctx.car.make) && (
                <div className="mt-1">
                  {ctx.car.plate ? <span className="px-1.5 py-0.5 border rounded bg-white">{ctx.car.plate}</span> : null}
                  {" "}
                  {[ctx.car.make, ctx.car.model, ctx.car.version].filter(Boolean).join(" ")}
                  {ctx.car.price ? ` — ${Number(ctx.car.price).toLocaleString()} €` : ""}
                </div>
              )}
            </div>

            {/* CONTENT */}
            {tab === "info" && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-600">Template (email-based)</label>
                  <select value={templateId} onChange={e=>onTemplateChange(e.target.value)} className="w-full px-3 py-2 border rounded">
                    {infoTemplates.length ? infoTemplates.map(t => <option key={t.id} value={t.id}>{t.title}</option>) : <option value="">(No templates)</option>}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Message</label>
                  <textarea value={message} onChange={e=>setMessage(e.target.value)} className="w-full h-56 px-3 py-2 border rounded font-mono text-[13px]" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">Use Copy and paste into your channel.</div>
                  <button onClick={copyMessage} className="px-3 py-2 border rounded">Copy</button>
                </div>
              </div>
            )}

            {tab === "images" && (
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  Create a quick reminder to send requested photos (due in <b>1 hour</b>).
                </p>
                <button onClick={createImagesReminder} className="px-3 py-2 border rounded bg-gray-900 text-white">
                  Create 1h Reminder
                </button>
              </div>
            )}

            {tab === "pdf" && (
              <div className="space-y-2">
                <p className="text-sm text-gray-700">Choose how to export:</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={()=>generateProposalPdf(ctx, message || "")} className="px-3 py-2 border rounded bg-gray-900 text-white">Download/Print PDF</button>
                  <button onClick={()=>openPrintPreview(ctx, message)} className="px-3 py-2 border rounded">Open Print Preview</button>
                  <button onClick={()=>openDesignMock(ctx, message)} className="px-3 py-2 border rounded">Open Design Mock</button>
                  <button onClick={()=>{ setTab("info"); }} className="px-3 py-2 border rounded">Edit Message First</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ label, active, onClick }){
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded border text-sm ${active ? "bg-gray-900 text-white border-gray-900" : "bg-white"}`}
    >
      {label}
    </button>
  );
}

/***********************
 * Print/Design helpers (kept inline for standalone)
 ***********************/
function printableHtml(ctx, message){
  const rows = [
    ["Matrícula", ctx.car.plate],
    ["Marca/Modelo", [ctx.car.make, ctx.car.model].filter(Boolean).join(" ")],
    ["Versão", ctx.car.version],
    ["Ano", ctx.car.year],
    ["Quilómetros", ctx.car.mileage ? `${Number(ctx.car.mileage).toLocaleString()} km` : ""],
    ["Combustível", ctx.car.fuel],
    ["Transmissão", ctx.car.transmission],
    ["Cor", ctx.car.color],
    ["Preço", ctx.car.price ? `${Number(ctx.car.price).toLocaleString()} €` : ""],
    ["Estado", ctx.car.status || "Disponível"]
  ];
  const safe = (s)=> String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Proposta — ${safe(ctx.car.make)} ${safe(ctx.car.model)} ${safe(ctx.car.plate)}</title>
<style>
  body{font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding:24px; color:#111;}
  h1{font-size:20px; margin:0 0 8px;}
  h2{font-size:14px; margin:0 0 16px; color:#555;}
  table{border-collapse:collapse; width:100%; margin-top:12px;}
  th,td{border:1px solid #e5e7eb; padding:8px 10px; font-size:13px;}
  th{background:#f8fafc; text-align:left; width:200px;}
  .muted{color:#6b7280; font-size:12px; margin-top:24px;}
  .block{white-space:pre-wrap; border:1px solid #e5e7eb; padding:12px; border-radius:10px; background:#fafafa; margin-top:12px;}
</style>
</head>
<body>
  <h1>Informação do Veículo</h1>
  <h2>${safe(ctx.car.make)} ${safe(ctx.car.model)} ${safe(ctx.car.version || "")} — ${safe(ctx.car.plate || "")}</h2>
  <table>
    <tbody>
      ${rows.map(([k,v])=>`<tr><th>${safe(k)}</th><td>${safe(v)}</td></tr>`).join("")}
    </tbody>
  </table>

  <h1 style="margin-top:24px;">Mensagem</h1>
  <div class="block">${safe(message||"")}</div>

  <div class="muted">Gerado para ${safe(ctx.lead?.name || "")} por ${safe(ctx.owner?.name || "")}</div>
</body>
</html>
  `.trim();
}

function designMockHtml(ctx, message){
  const safe = (s)=> String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const dealer = {
    name: "AutoStand — Demo Motors",
    address: "Rua do Exemplo 123, 1000-000 Lisboa",
    phone: "+351 912 345 678",
    email: "info@autostand.pt",
    website: "www.autostand.pt"
  };
  const dummy = message || `Obrigado pelo seu interesse. Seguem informações detalhadas do veículo e condições.\n— Dummy copy —`;
  const rows = [
    ["Matrícula", ctx.car.plate || "AA-00-AA"],
    ["Marca/Modelo", [ctx.car.make || "Marca", ctx.car.model || "Modelo"].join(" ")],
    ["Versão", ctx.car.version || "—"],
    ["Ano", ctx.car.year || "2020"],
    ["Quilómetros", ctx.car.mileage ? `${Number(ctx.car.mileage).toLocaleString()} km` : "45 000 km"],
    ["Combustível", ctx.car.fuel || "Gasolina"],
    ["Transmissão", ctx.car.transmission || "Manual"],
    ["Cor", ctx.car.color || "Preto"],
    ["Preço", ctx.car.price ? `${Number(ctx.car.price).toLocaleString()} €` : "17 900 €"],
    ["Estado", ctx.car.status || "Disponível"]
  ];

  const LOGO = encodeURIComponent(`
    <svg width="140" height="40" viewBox="0 0 140 40" xmlns="http://www.w3.org/2000/svg">
      <rect rx="6" width="140" height="40" fill="#111827"/>
      <text x="70" y="25" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="16" font-weight="700">AUTOSTAND</text>
    </svg>
  `);

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Proposta — ${safe(ctx.car.make || "Marca")} ${safe(ctx.car.model || "Modelo")}</title>
<style>
  :root{ --ink:#0f172a; --muted:#64748b; --soft:#f1f5f9; --line:#e2e8f0; }
  *{box-sizing:border-box}
  body{font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:var(--ink); margin:0; padding:40px;}
  .header{display:flex; align-items:center; justify-content:space-between; gap:24px; border-bottom:1px solid var(--line); padding-bottom:16px; margin-bottom:24px;}
  .dealer{font-size:12px; color:var(--muted); line-height:1.4}
  h1{font-size:20px; margin:0 0 8px}
  h2{font-size:14px; margin:0 0 16px; color:var(--muted)}
  table{border-collapse:collapse; width:100%; margin-top:8px;}
  th,td{border:1px solid var(--line); padding:10px 12px; font-size:13px; vertical-align:top}
  th{background:var(--soft); text-align:left; width:200px;}
  .block{white-space:pre-wrap; border:1px solid var(--line); padding:14px; border-radius:10px; background:#fff; margin-top:12px;}
  .note{color:var(--muted); font-size:12px; margin-top:24px}
</style>
</head>
<body>
  <div class="header">
    <img alt="Logo" width="140" height="40" src="data:image/svg+xml;utf8,${LOGO}" />
    <div class="dealer">
      <div><b>${safe(dealer.name)}</b></div>
      <div>${safe(dealer.address)}</div>
      <div>Tel ${safe(dealer.phone)} • ${safe(dealer.email)}</div>
      <div>${safe(dealer.website)}</div>
    </div>
  </div>

  <h1>Informação do Veículo</h1>
  <h2>${safe(ctx.car.make || "Marca")} ${safe(ctx.car.model || "Modelo")} ${safe(ctx.car.version || "")} — ${safe(ctx.car.plate || "AA-00-AA")}</h2>
  <table>
    <tbody>
      ${rows.map(([k,v])=>`<tr><th>${safe(k)}</th><td>${safe(v)}</td></tr>`).join("")}
    </tbody>
  </table>

  <h1 style="margin-top:24px;">Mensagem</h1>
  <div class="block">${safe(dummy)}</div>

  <div class="note">Gerado para ${safe(ctx.lead?.name || "")} por ${safe(ctx.owner?.name || "")}</div>
</body>
</html>
  `.trim();
}

function openPrintPreview(ctx, message){
  const html = printableHtml(ctx, message || "");
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  try { w.focus(); } catch {}
}

function openDesignMock(ctx, message){
  const html = designMockHtml(ctx, message || "");
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  try { w.focus(); } catch {}
}

/***********************
 * Demo wrapper
 ***********************/
export default function DemoRespondWizard(){
  const [open, setOpen] = useState(true);
  // Single mocked lead id from useLeads()
  const leadId = "lead_1";

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">RespondWizard — Standalone Mock</h1>
          <button onClick={()=>setOpen(true)} className="px-3 py-2 rounded-lg border bg-white">Open Wizard</button>
        </header>
        <p className="text-sm text-gray-600">This demo runs without your app stores. It mocks <code>leads</code>, <code>inventory</code>, <code>todos</code>, and template rendering. PDF export opens a print-friendly window.</p>
      </div>

      {/* Modal */}
      <RespondWizard open={open} leadId={leadId} onClose={()=>setOpen(false)} />
    </div>
  );
}
