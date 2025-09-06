import React, { useEffect, useMemo, useState } from "react";
import { FiX, FiChevronDown, FiFilePlus } from "react-icons/fi";
import { listStagingPlates, listCarsStaging } from "../../inventory/services/cars";
import { supabase } from "../../../lib/supabase";
import { getTenantId } from "../../../lib/tenant";
import { assembleDocContext } from "../services/context";

export default function DocumentWizard({ open, onClose, onCreate, initialType = 'blank', initialLeadId = null }){
  const [type, setType] = useState(initialType); // blank | checklist | car
  const [title, setTitle] = useState('Untitled Document');
  const [titleTouched, setTitleTouched] = useState(false);
  const [plates, setPlates] = useState([]);
  const [plate, setPlate] = useState('');
  const [cars, setCars] = useState([]);
  const [leadName, setLeadName] = useState('');
  const [leadId, setLeadId] = useState(initialLeadId);
  const [templates, setTemplates] = useState([]);
  const [tplId, setTplId] = useState('');

  useEffect(()=>{
    if (!open) return;
    setType(initialType || 'blank');
    setTitle('Untitled Document');
    setTitleTouched(false);
    setPlate(''); setLeadName(''); setLeadId(initialLeadId || null);
    (async ()=>{
      try { const p = await listStagingPlates(); setPlates(p||[]); }
      catch { setPlates([]); }
      try { const { rows } = await listCarsStaging({}); setCars(rows||[]); }
      catch { setCars([]); }
      // Load templates to allow prefill
      try{
        const { data: tpls } = await supabase
          .from('templates')
          .select('id,name,category,subject,body')
          .order('name', { ascending: true });
        setTemplates(Array.isArray(tpls) ? tpls : []);
      }catch{ setTemplates([]); }
      // If leadId provided, prefill plate and name
      if (initialLeadId){
        try{
          const { data } = await supabase.from('leads').select('name,plate').eq('id', initialLeadId).maybeSingle();
          if (data){ setLeadName(data.name || ''); setPlate(data.plate || ''); setType(initialType || 'car'); }
        }catch{}
      }
    })();
  }, [open, initialType, initialLeadId]);

  // When plate is selected, try to auto-detect a lead with that plate
  useEffect(()=>{
    if (!open || !plate) return;
    (async ()=>{
      try{
        const { data, error } = await supabase
          .from('leads')
          .select('name, updated_at')
          .eq('org_id', getTenantId())
          .eq('plate', plate)
          .order('updated_at', { ascending: false })
          .limit(1);
        if (!error && data && data[0] && !leadName){
          setLeadName(data[0].name || '');
        }
      }catch{/* noop */}
    })();
  }, [open, plate]);

  // Auto-title based on document type and client name (except for blank/new)
  useEffect(()=>{
    if (!open) return;
    if (titleTouched) return; // user overrides
    if (type === 'blank') return; // do not auto-name for blank/new
    const label = (type === 'car') ? 'Car Document' : (type === 'checklist' ? 'Checklist' : 'Document');
    // For checklist prefer plate (no lead name in document title). For car use lead name if present else plate.
    const who = (type === 'checklist') ? (plate || '') : (leadName?.trim() || plate || '');
    const auto = who ? `${label} — ${who}` : label;
    setTitle(auto);
  }, [open, type, leadName, plate, titleTouched]);

  if (!open) return null;

  function create(){
    if (type === 'car'){
      if (leadId){
        (async ()=>{
          try{
            const ctx = await assembleDocContext({ leadId });
            const defaultBody = [
              'Olá {{client.name}},',
              '',
              'Obrigado pelo seu contacto e pelo interesse no {{car.brand}} {{car.model}} ({{car.year}}).',
              'Este veículo destaca-se pelo seu excelente estado, baixo consumo e fiabilidade reconhecida.',
              '',
              'Gostaria de lhe dar mais informações:',
              '- Quilometragem: {{car.mileage}} km',
              '- Combustível: {{car.fuel}}',
              '- Extras: {{car.extras}}',
              '',
              'Podemos agendar uma visita ao stand para que veja o carro de perto e, se desejar, faça um test-drive sem compromisso.',
              '',
              'Qual a melhor altura para si?',
              '',
              'Cumprimentos,',
              '{{agent.name}}',
              '{{stand.name}}'
            ].join('\n');
            const chosen = templates.find(t => String(t.id) === String(tplId));
            const body = chosen?.body || defaultBody;
            onCreate?.({ title: (title || chosen?.name || 'Ficha de Veículo'), body, type, ctx });
            onClose?.();
          }catch(e){ alert(e?.message || 'Failed to prepare context'); }
        })();
        return;
      }
      const row = (cars||[]).find(r => r['Matrícula'] === plate) || {};
      const ctx = {
        client: { name: leadName || 'Cliente' },
        car: {
          plate: row['Matrícula'] || plate,
          make: row['Marca'] || '',
          model: row['Modelo'] || '',
          version: row['Versão'] || '',
          first_reg: row['Data da primeira matrícula'] || '',
          km: row['KM'] || '',
          fuel: row['Combustível'] || '',
          color: row['Cor'] || '',
          cc: row['Cilindrada'] || '',
          hp: row['Potência'] || '',
        },
        dealer: { name:'Autotrust' }
      };
      const defaultBody = [
        'Olá {{client.name}},',
        '',
        'Obrigado pelo seu contacto e pelo interesse no {{car.brand}} {{car.model}} ({{car.year}}).',
        'Este veículo destaca-se pelo seu excelente estado, baixo consumo e fiabilidade reconhecida.',
        '',
        'Gostaria de lhe dar mais informações:',
        '- Quilometragem: {{car.mileage}} km',
        '- Combustível: {{car.fuel}}',
        '- Extras: {{car.extras}}',
        '',
        'Podemos agendar uma visita ao stand para que veja o carro de perto e, se desejar, faça um test-drive sem compromisso.',
        '',
        'Qual a melhor altura para si?',
        '',
        'Cumprimentos,',
        '{{agent.name}}',
        '{{stand.name}}'
      ].join('\n');
      const chosen = templates.find(t => String(t.id) === String(tplId));
      const body = chosen?.body || defaultBody;
      onCreate?.({ title: (title || chosen?.name || 'Ficha de Veículo'), body, type, ctx });
      onClose?.();
      return;
    }
    if (type === 'checklist'){
      if (leadId){
        (async ()=>{
          try{
            const ctx = await assembleDocContext({ leadId });
            const defaultBody = [
              `Olá {{lead.name}},`,
              '',
              'Checklist de estado e preparação da viatura.',
            ].join('\n');
            const chosen = templates.find(t => String(t.id) === String(tplId));
            const body = chosen?.body || defaultBody;
            onCreate?.({ title: (title || chosen?.name || 'Checklist'), body, type, ctx });
            onClose?.();
          }catch(e){ alert(e?.message || 'Failed to prepare context'); }
        })();
        return;
      }
      const row = (cars||[]).find(r => r['Matrícula'] === plate) || {};
      const ctx = {
        client: { name: leadName || 'Cliente' },
        car: {
          plate: row['Matrícula'] || plate,
          make: row['Marca'] || '',
          model: row['Modelo'] || '',
          version: row['Versão'] || '',
          first_reg: row['Data da primeira matrícula'] || '',
          km: row['KM'] || '',
          fuel: row['Combustível'] || '',
          color: row['Cor'] || '',
          cc: row['Cilindrada'] || '',
          hp: row['Potência'] || '',
        },
        dealer: { name:'Autotrust' }
      };
      const body = [
        `Olá ${leadName || 'Cliente'},`,
        '',
        'Checklist de estado e preparação da viatura.',
      ].join('\n');
      onCreate?.({ title: title || 'Checklist', body, type, ctx });
      onClose?.();
      return;
    }
    // blank
    onCreate?.({ title: title || 'Documento', body: '', type });
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-[85] bg-black/30 flex items-start justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-medium inline-flex items-center gap-2"><FiFilePlus/> New Document</div>
          <button className="p-2 rounded border" onClick={onClose}><FiX/></button>
        </div>
        <div className="p-4 space-y-3">
          {/* Start from template */}
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Start from template</div>
            <select className="w-full rounded-lg border px-3 py-2 text-sm" value={tplId} onChange={(e)=>{
              const id = e.target.value; setTplId(id);
              const t = templates.find(x => String(x.id) === String(id));
              if (t){ if (!titleTouched) setTitle(t.name || title); }
            }}>
              <option value="">— None —</option>
              {(templates||[]).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          {type === 'car' && (
            <label className="text-sm block">
              <div className="text-slate-600 mb-1">Lead Name (saudação)</div>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={leadName} onChange={(e)=> setLeadName(e.target.value)} placeholder="Nome do cliente"/>
            </label>
          )}
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Type</div>
            <select className="w-full rounded-lg border px-3 py-2 text-sm" value={type} onChange={(e)=> setType(e.target.value)}>
              <option value="blank">Blank Document</option>
              <option value="checklist">Checklist</option>
              <option value="car">Car Document</option>
            </select>
          </label>
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Title</div>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={title} onChange={(e)=> { setTitle(e.target.value); setTitleTouched(true); }} placeholder="Document title"/>
          </label>

          {(type === 'car' || type === 'checklist') && (
            <label className="text-sm block">
              <div className="text-slate-600 mb-1">Matrícula (viaturas importadas por CSV)</div>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={plate} onChange={(e)=> setPlate(e.target.value)}>
                <option value="">Select plate…</option>
                {plates.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button className="px-3 py-2 rounded border" onClick={onClose}>Cancel</button>
            <button className="px-3 py-2 rounded bg-gray-900 text-white" onClick={create} disabled={(type==='car' || type==='checklist') && !leadId && !plate}>Create</button>
          </div>
        </div>
      </div>
    </div>
  );
}
