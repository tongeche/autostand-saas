import React, { useEffect, useMemo, useState } from "react";
import { FiChevronDown, FiChevronRight, FiEye, FiFilePlus, FiSave, FiUpload, FiSettings, FiShare2, FiTrash2 } from "react-icons/fi";
import { supabase } from "../../../lib/supabase";
import { getTenantId } from "../../../lib/tenant";
import DocumentWizard from "../components/DocumentWizard.jsx";
import TemplateWizard from "../components/TemplateWizard.jsx";
import { useLocation, useNavigate } from "react-router-dom";

// Simple {{ key }} placeholder renderer
function render(body, ctx){
  const flat = ctx || {};
  return String(body||"").replace(/{{\s*([\w.]+)\s*}}/g, (_,k)=> String(flat[k] ?? ""));
}

export default function DocumentManager(){
  const orgId = getTenantId();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [stages, setStages] = useState([]);
  const [leadsByStage, setLeadsByStage] = useState({});
  const [templates, setTemplates] = useState([]);
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState({ title: "Untitled Document", body: "", ctx: {}, type: "text" });
  const [wizardOpen, setWizardOpen] = useState(false);
  const [tplWizardOpen, setTplWizardOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Load pipeline stages, leads and templates
  useEffect(()=>{
    (async ()=>{
      try{
        setBusy(true); setErr("");
        // stages
        const { data: ps, error: e1 } = await supabase
          .from('pipeline_stages')
          .select('id,name,position,is_closed')
          .eq('org_id', orgId)
          .order('position', { ascending: true });
        if (e1) throw e1; setStages(ps || []);
        // leads grouped
        const { data: leads, error: e2 } = await supabase
          .from('leads')
          .select('id,name,email,phone,plate,stage_id')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(500);
        if (e2) throw e2;
        const map = {};
        (leads||[]).forEach(l => { const k = l.stage_id || 'none'; (map[k] ||= []).push(l); });
        setLeadsByStage(map);
        // templates table (fallback to in-file samples if empty)
        const { data: tpls } = await supabase
          .from('templates')
          .select('id,name,category,subject,body')
          .order('name', { ascending: true });
        const all = (tpls && tpls.length) ? tpls : SAMPLE_FALLBACK_TEMPLATES;
        setTemplates(all);
        setSelectedTpl(all[0] || null);
      }catch(e){ setErr(e.message || String(e)); }
      finally{ setBusy(false); }
    })();
  }, [orgId]);

  // open wizard from URL (?new=car|checklist|blank)
  useEffect(()=>{
    const params = new URLSearchParams(location.search);
    const kind = params.get('new');
    if (kind){ setWizardOpen(true); const next = new URLSearchParams(location.search); next.delete('new'); navigate({ search: next.toString() }, { replace: true }); }
  }, []);

  function openEditorFromTemplate(tpl, lead){
    const ctx = makeCtxFromLead(lead);
    const title = tpl?.name || 'Document';
    const body = tpl?.body || '';
    setEditor({ title, body, ctx, type: 'text' });
    setEditorOpen(true);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xl font-semibold truncate">Documents</div>
          <div className="text-sm text-slate-600 hidden sm:block">Create documents from templates, aligned with your pipeline.</div>
        </div>
      </div>

      {err && <div className="text-sm text-red-700 bg-red-50 rounded-xl p-3 shadow-sm">{err}</div>}

      {/* Action Center (Emitir / Manage Rules / Upload) */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="flex items-center justify-center gap-4">
          {/* Emitir dropdown with submenus */}
          <EmitirMenu templates={templates} onPickTemplate={(t)=>{ setSelectedTpl(t); setEditor({ title: t?.name||'Document', body: t?.body||'', ctx:{}, type:'text' }); setEditorOpen(true); }} onNewBlank={()=> setWizardOpen(true)} />
          <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-xl shadow" onClick={()=> setTplWizardOpen(true)}> <FiFilePlus className="inline mr-2"/> Create Templates</button>
          <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-xl shadow" onClick={()=> alert('Rules coming soon')}> <FiSettings className="inline mr-2"/> Manage Rules</button>
          <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-xl shadow" onClick={()=> alert('Upload coming soon')}> <FiUpload className="inline mr-2"/> Upload</button>
        </div>
      </div>

      {/* Pipeline categories */}
      <div className="bg-white p-4 rounded-xl shadow-md">
        <div className="px-1 pb-2 text-sm text-slate-600">Pipeline</div>
        <div>
          {(stages||[]).map(s => (
            <StageRow key={s.id} stage={s} leads={leadsByStage[s.id]||[]} onCreate={(lead)=> openEditorFromTemplate(selectedTpl||SAMPLE_FALLBACK_TEMPLATES[0], lead)} />
          ))}
          {stages?.length===0 && <div className="p-3 text-sm text-slate-600">No stages yet.</div>}
        </div>
      </div>

      {editorOpen && (
        <DocEditorModal
          init={editor}
          onClose={()=> setEditorOpen(false)}
          onPreview={(ed)=> openPreview(ed)}
          onShare={(ed)=> { setEditor(ed); setShareOpen(true); }}
          onDelete={()=> setDeleteOpen(true)}
        />
      )}

      <DocumentWizard initialType={'blank'} open={wizardOpen} onClose={()=> setWizardOpen(false)} onCreate={({ title, body, ctx, type })=>{
        setEditor({ title, body, ctx, type });
        setEditorOpen(true);
        setWizardOpen(false);
      }} />

      {/* Create Templates Wizard */}
      <TemplateWizard open={tplWizardOpen} onClose={()=> setTplWizardOpen(false)} onCreated={(t)=>{
        setTemplates(prev => [t, ...(prev||[])]);
        setSelectedTpl(t);
      }} />

      {/* Share modal */}
      {shareOpen && (
        <ShareModal
          title={editor?.title}
          body={render(editor?.body, editor?.ctx)}
          onClose={()=> setShareOpen(false)}
        />
      )}

      {/* Delete confirm modal (no persistence yet) */}
      {deleteOpen && (
        <DeleteConfirmModal
          onCancel={()=> setDeleteOpen(false)}
          onConfirm={()=> { setDeleteOpen(false); setEditorOpen(false); }}
        />
      )}
    </div>
  );
}

function StageRow({ stage, leads, onCreate }){
  const [open, setOpen] = useState(false);
  return (
    <div className="p-2">
      <button className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-slate-50" onClick={()=> setOpen(v=>!v)}>
        <div className="inline-flex items-center gap-2">
          {open ? <FiChevronDown/> : <FiChevronRight/>}
          <div className="font-medium">{stage.name}</div>
          <div className="text-xs text-slate-500">{leads.length} leads</div>
        </div>
      </button>
      {open && (
        <div className="pl-6 pr-2 pb-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          {leads.map(l => (
            <div key={l.id} className="rounded-xl p-3 flex items-center justify-between bg-white shadow">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{l.name || l.email || l.phone || l.plate || l.id}</div>
                <div className="text-xs text-slate-500 truncate">{l.email || l.phone || l.plate || ''}</div>
              </div>
              <div className="inline-flex items-center gap-1">
                <button className="px-3 py-1.5 rounded-xl text-white text-xs font-medium shadow" style={{ background:'#3C6B5B' }} onClick={()=> onCreate?.(l)}>Use template</button>
              </div>
            </div>
          ))}
          {leads.length===0 && <div className="text-sm text-slate-600">No leads in this stage.</div>}
        </div>
      )}
    </div>
  );
}

function DocEditorModal({ init, onClose, onPreview, onShare, onDelete }){
  const [title, setTitle] = useState(init?.title || 'Untitled Document');
  const [body, setBody] = useState(init?.body || '');
  const [ctx] = useState(init?.ctx || {});
  return (
    <div className="fixed inset-0 z-[90] bg-black/30 flex items-start justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom:'1px solid #e5e7eb' }}>
          <div className="font-medium">Edit Document</div>
          <button className="p-2 rounded border" onClick={onClose}>×</button>
        </div>
        <div className="p-4 space-y-3">
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Title</div>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={title} onChange={(e)=> setTitle(e.target.value)} />
          </label>
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Body</div>
            <textarea className="w-full rounded-lg border px-3 py-2 text-sm min-h-[220px]" value={body} onChange={(e)=> setBody(e.target.value)} />
          </label>
          <div className="flex items-center justify-end gap-2">
            <button className="px-3 py-2 rounded-xl bg-gray-200 text-gray-800 text-sm font-medium" onClick={onClose}>Close</button>
            <button className="px-3 py-2 rounded-xl text-white text-sm inline-flex items-center gap-2 font-medium" style={{ background:'#3C6B5B' }} onClick={()=> onPreview?.({ title, body, ctx })}><FiEye/> Preview</button>
            <button className="px-3 py-2 rounded-xl text-white text-sm inline-flex items-center gap-2 font-medium" style={{ background:'#7c3aed' }}><FiSave/> Save</button>
            <button className="px-3 py-2 rounded-xl bg-gray-200 text-gray-800 text-sm inline-flex items-center gap-2 font-medium" onClick={()=> onShare?.({ title, body, ctx })}><FiShare2/> Share</button>
            <button className="px-3 py-2 rounded-xl bg-gray-200 text-red-700 text-sm inline-flex items-center gap-2 font-medium" onClick={onDelete}><FiTrash2/> Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function openPreview({ title, body, ctx }){
  const html = printableHtml(title, render(body, ctx), ctx, 'text');
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open(); w.document.write(html); w.document.close();
  try { w.focus(); } catch {}
}

const SAMPLE_FALLBACK_TEMPLATES = [
  { id: 'car-proposal', name: 'Vehicle Proposal', body: 'Olá {{client.name}},\nSegue a proposta para {{car.make}} {{car.model}} ({{car.plate}}).\nPreço: {{car.price}} €.' },
  { id: 'followup', name: 'Follow‑up', body: 'Hello {{client.name}},\nFollowing up about the {{car.make}} {{car.model}}.' }
];

function makeCtxFromLead(l){
  const name = l?.name || '';
  return {
    client: { name },
    car: { plate: l?.plate || '', make: '', model: '', price: '' },
    dealer: { name: 'Autotrust' }
  };
}

// Printable HTML (keeps the older document output styling)
function printableHtml(title, content, _ctx, docType){
  function safe(x){ return String(x||'').replace(/[&<>]/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  const header = (()=>{
    if (docType !== 'car') return '';
    return `<div style="display:flex;gap:16px;align-items:center;margin-bottom:12px">
      <div style="width:64px;height:64px;border-radius:12px;background:#f3f4f6"></div>
      <div>
        <div style="font-weight:600">Ficha do Veículo</div>
        <div style="color:#64748b;font-size:12px">Gerado automaticamente</div>
      </div>
    </div>`;
  })();
  const spec = (()=>{
    if (docType !== 'car') return '';
    return `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;border:1px solid #e5e7eb;border-radius:12px;padding:12px">
      <div><div style="color:#64748b;font-size:12px">Matrícula</div><div style="font-weight:600">—</div></div>
      <div><div style="color:#64748b;font-size:12px">Primeira matrícula</div><div style="font-weight:600">—</div></div>
    </div>`;
  })();
  const checklist = (()=> docType==='checklist' ? `<div style="margin-top:16px">Checklist…</div>` : '')();
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
}

// Share Modal copied stylistically from template (Email / WhatsApp)
function ShareModal({ title, body, onClose }){
  function mailto(){
    const subj = encodeURIComponent(title || 'Document');
    const txt = encodeURIComponent(body || '');
    return `mailto:?subject=${subj}&body=${txt}`;
  }
  function whatsapp(){
    const txt = encodeURIComponent(`*${title || 'Document'}*\n\n${body || ''}`);
    return `https://wa.me/?text=${txt}`;
  }
  return (
    <div className="fixed inset-0 z-[95] bg-black/30 flex items-start justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom:'1px solid #e5e7eb' }}>
          <div className="font-medium">Share Document</div>
          <button className="p-2 rounded border" onClick={onClose}>×</button>
        </div>
        <div className="p-4 space-y-3">
          <a href={mailto()} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-xl flex items-center justify-center"><FiShare2 className="mr-2"/> Share via Email</a>
          <a href={whatsapp()} target="_blank" rel="noreferrer" className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-xl flex items-center justify-center">💬 Share via WhatsApp</a>
        </div>
      </div>
    </div>
  );
}

// Delete confirm modal (template-like)
function DeleteConfirmModal({ onCancel, onConfirm }){
  return (
    <div className="fixed inset-0 z-[95] bg-black/30 flex items-start justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3">
          <h4 className="text-xl font-bold text-gray-800 mb-1">Confirm Deletion</h4>
          <p className="mb-4 text-sm text-slate-700">Are you sure you want to delete this document?</p>
          <div className="flex justify-end gap-2">
            <button className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-xl" onClick={onCancel}>Cancel</button>
            <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl" onClick={onConfirm}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Emitir menu with submenus (adapts the template UX). Pure client-side.
function EmitirMenu({ templates, onPickTemplate, onNewBlank }){
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState(null); // 'templates' | 'create' | null
  return (
    <div className="relative inline-block text-left">
      <button onClick={()=>{ setOpen(v=>!v); setSubmenu(null); }} className="text-white font-bold py-3 px-6 rounded-xl shadow-lg" style={{ background:'#3C6B5B' }}>
        Emitir <span className="ml-2">▼</span>
      </button>
      {open && (
        <div className="absolute mt-2 w-56 bg-white rounded-xl shadow-lg p-2 z-10">
          <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase">Most Used</div>
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50" onClick={()=>{ onPickTemplate?.(templates[0] || SAMPLE_FALLBACK_TEMPLATES[0]); setOpen(false); }}>⭐ Quick Proposal</button>
          <div className="my-1"/>
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50" onMouseEnter={()=> setSubmenu('templates')} onClick={()=> setSubmenu('templates')}>Use Templates →</button>
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50" onMouseEnter={()=> setSubmenu('create')} onClick={()=> setSubmenu('create')}>Create New →</button>
          {/* Submenus */}
          {submenu==='templates' && (
            <div className="absolute left-[14rem] top-10 w-64 bg-white rounded-xl shadow-lg p-2">
              {(templates||SAMPLE_FALLBACK_TEMPLATES).slice(0,6).map(t => (
                <button key={t.id} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50" onClick={()=>{ onPickTemplate?.(t); setOpen(false); }}>{t.name}</button>
              ))}
            </div>
          )}
          {submenu==='create' && (
            <div className="absolute left-[14rem] top-24 w-64 bg-white rounded-xl shadow-lg p-2">
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50" onClick={()=>{ onNewBlank?.(); setOpen(false); }}>Blank Document</button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50" onClick={()=> alert('AI generation coming soon')}>Generate with AI</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
