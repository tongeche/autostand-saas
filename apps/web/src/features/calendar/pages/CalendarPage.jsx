import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { FiChevronLeft, FiChevronRight, FiShare, FiCalendar, FiMenu } from "react-icons/fi";
import { supabase } from "../../../lib/supabase";
import { listTenantLeadTasks } from "../../leads/services/supabase";
import { listEventsBetween, updateEventStart } from "../services/events";
import CalendarWizard from "../components/CalendarWizard.jsx";

export default function CalendarPage(){
  const location = useLocation();
  const [start, setStart] = useState(startOfWeek(new Date()));
  const [monthStart, setMonthStart] = useState(startOfMonth(new Date()));
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const [initialType, setInitialType] = useState('task');
  const [initDate, setInitDate] = useState(null);
  const [initTime, setInitTime] = useState(null);
  const [miniOpen, setMiniOpen] = useState(false);
  const [leadMap, setLeadMap] = useState({});
  const [editEvent, setEditEvent] = useState(null);
  const [mode, setMode] = useState('week'); // 'week' | 'month'

  const days = useMemo(()=> Array.from({length:7}, (_,i)=> addDays(start,i)), [start]);
  const monthDays = useMemo(()=> buildMonthGrid(monthStart), [monthStart]);

  async function load(){
    const from = mode === 'week' ? days[0] : monthDays[0];
    const to = mode === 'week' ? addDays(days[6], 1) : addDays(monthDays[monthDays.length-1], 1);
    try{
      const evs = await listEventsBetween({ from, to });
      const mapped = evs.map(e => ({ id:e.id, lead_id: e.lead_id || null, title:e.title||'(untitled)', start: new Date(e.start_at), kind: e.kind||'task', note: e.note || '', reminder_minutes: e.reminder_minutes }));
      setEvents(mapped);
      const leadIds = Array.from(new Set(mapped.map(m=> m.lead_id).filter(Boolean)));
      if (leadIds.length){
        const { data } = await supabase.from('leads').select('id,name,plate').in('id', leadIds);
        const m = {}; (data||[]).forEach(l => { m[l.id] = l; });
        setLeadMap(m);
      } else setLeadMap({});
    } catch {
      // fallback: tasks mapping if events table not available
      const fromD = toISODate(days[0]);
      const toD = toISODate(days[6]);
      const { rows } = await listTenantLeadTasks({ onlyOpen:false, status:'all', limit:500, offset:0 });
      const inWeek = (rows||[]).filter(t => t.due_date && t.due_date >= fromD && t.due_date <= toD);
      const mapped = inWeek.map(t => ({ id:t.id, lead_id: t.lead_id || null, title:t.title||'(untitled)', start: new Date(`${t.due_date}T10:00:00`), kind: (t.status==='done'?'done':'task') }));
      setEvents(mapped);
      const leadIds = Array.from(new Set(mapped.map(m=> m.lead_id).filter(Boolean)));
      if (leadIds.length){
        const { data } = await supabase.from('leads').select('id,name,plate').in('id', leadIds);
        const m = {}; (data||[]).forEach(l => { m[l.id] = l; });
        setLeadMap(m);
      } else setLeadMap({});
    }
  }

  useEffect(()=>{ load(); }, [start, monthStart, mode]);
  // Auto scroll to current time on mount/change
  useEffect(()=>{
    const el = document.getElementById('cal-now-line');
    if (el) setTimeout(()=> el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);
  }, [start, events]);
  useEffect(()=>{
    const onCal = (e) => { const d = e.detail; if (!d) return; setEvents(prev => [...prev, { id: 'temp_'+Date.now(), title:d.title, start:new Date(d.start), kind:d.kind||'task' }]); };
    const onTask = () => load();
    window.addEventListener('autostand:calendar:event', onCal);
    window.addEventListener('autostand:lead_task:created', onTask);
    return ()=>{ window.removeEventListener('autostand:calendar:event', onCal); window.removeEventListener('autostand:lead_task:created', onTask); };
  }, []);

  useEffect(()=>{
    const params = new URLSearchParams(location.search);
    const kind = params.get('new');
    if (kind){ setInitialType(kind); setOpen(true); }
  }, [location.search]);

  const monthLabel = (mode==='week' ? days[3] : monthStart).toLocaleString(undefined, { month:'long', year:'numeric' });
  const weekNumber = getWeekNumber(days[3]);
  // Collapse main app sidebar when landing on calendar
  useEffect(()=>{ try{ window.dispatchEvent(new Event('autostand:sidebar:collapse')); }catch{} }, []);

  // Helper: fetch events for any week start (used by MiniSide to preview last week)
  async function fetchWeekEvents(weekStart){
    const from = weekStart;
    const to = addDays(weekStart, 7);
    try{
      const evs = await listEventsBetween({ from, to });
      return evs.map(e => ({ id:e.id, title:e.title||'(untitled)', start: new Date(e.start_at), kind: e.kind||'task', note: e.note || '', reminder_minutes: e.reminder_minutes }));
    } catch {
      // fallback to tasks
      const fromD = toISODate(from);
      const toD = toISODate(addDays(weekStart, 6));
      const { rows } = await listTenantLeadTasks({ onlyOpen:false, status:'all', limit:500, offset:0 });
      const inRange = (rows||[]).filter(t => t.due_date && t.due_date >= fromD && t.due_date <= toD);
      return inRange.map(t => ({ id:t.id, title:t.title||'(untitled)', start: new Date(`${t.due_date}T10:00:00`), kind: (t.status==='done'?'done':'task') }));
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="inline-flex items-center gap-2 text-slate-700">
          <span className="text-lg md:text-xl font-semibold capitalize">{monthLabel}</span>
          {mode==='week' && <span className="text-slate-500">/ W{weekNumber}</span>}
          <button className="icon-btn" onClick={()=> mode==='week' ? setStart(addDays(start,-7)) : setMonthStart(addMonths(monthStart,-1))} title="Prev">←</button>
          <button className="icon-btn" onClick={()=> mode==='week' ? setStart(addDays(start,7)) : setMonthStart(addMonths(monthStart,1))} title="Next">→</button>
        </div>
        <div className="inline-flex items-center gap-2 flex-wrap justify-end">
          <div className="hidden sm:inline-flex rounded-xl border border-gray-200 overflow-hidden text-sm">
            {mode==='week' ? (
              <>
                <button className="px-3 py-1.5" onClick={()=> setStart(addDays(startOfWeek(new Date()), -7))}>Last week</button>
                <button className="px-3 py-1.5 bg-slate-900 text-white" onClick={()=> setStart(startOfWeek(new Date()))}>This week</button>
                <button className="px-3 py-1.5" onClick={()=> setStart(startOfWeek(new Date()))}>Today</button>
              </>
            ) : (
              <>
                <button className="px-3 py-1.5" onClick={()=> setMonthStart(addMonths(startOfMonth(new Date()), -1))}>Last month</button>
                <button className="px-3 py-1.5 bg-slate-900 text-white" onClick={()=> setMonthStart(startOfMonth(new Date()))}>This month</button>
                <button className="px-3 py-1.5" onClick={()=> setMonthStart(startOfMonth(new Date()))}>Today</button>
              </>
            )}
          </div>
          <div className="inline-flex rounded-xl border border-gray-200 overflow-hidden text-xs">
            <button className={`px-3 py-1.5 ${mode==='week' ? 'bg-slate-900 text-white' : ''}`} onClick={()=> setMode('week')}>Week</button>
            <button className={`px-3 py-1.5 ${mode==='month' ? 'bg-slate-900 text-white' : ''}`} onClick={()=> setMode('month')}>Month</button>
          </div>
          <button className="sm:hidden icon-btn" onClick={()=> setMiniOpen(v=>!v)} title="Menu"><FiMenu/></button>
          <button className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm" onClick={()=> { setInitDate(toISODate(new Date())); setInitTime(null); setInitialType('task'); setOpen(true); }}>+ New</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3">
        {/* Mini side */}
        <MiniSide open={miniOpen} onClose={()=> setMiniOpen(false)} onJump={(date)=> setStart(startOfWeek(date))}
          onNew={(d)=> { setInitDate(toISODate(d)); setInitTime('10:00'); setInitialType('task'); setOpen(true); }} days={days} events={events} weekStart={start} onFetchWeek={fetchWeekEvents} />

        {/* Calendar body */}
        <div className="space-y-3">
          {/* Days header */}
          {mode==='week' ? (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-7 md:grid-cols-8 gap-2 items-end text-sm md:min-w-[880px]">
                <div className="hidden md:block"></div>
                {days.map((d,i)=> (
                  <button key={i} className="text-center rounded hover:bg-slate-50 p-1" onClick={()=>{ setInitDate(toISODate(d)); setInitTime('10:00'); setInitialType('task'); setOpen(true); }}>
                    <div className="text-slate-500">{d.toLocaleDateString(undefined,{ weekday:'short'})}</div>
                    <div className="text-xl font-semibold">{d.getDate().toString().padStart(2,'0')}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm grid grid-cols-7 gap-2">
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((w,i)=>(
                <div key={i} className="text-center text-slate-500">{w}</div>
              ))}
            </div>
          )}

          {/* Grid */}
          {mode==='week' ? (
          <div className="overflow-x-auto">
            <div id="calendar-grid" className="grid grid-cols-7 md:grid-cols-8 gap-2 min-h-[520px] md:min-w-[880px] bg-white rounded-2xl border border-gray-200 p-2"
              style={{ backgroundImage: 'repeating-linear-gradient(to bottom, rgba(226,232,240,0.8) 0px, rgba(226,232,240,0.8) 1px, transparent 1px, transparent 64px)' }}
            >
              {/* time col */}
              <div className="text-right pr-2 text-slate-500 text-sm hidden md:block">
                {['all day','9 am','10 am','11 am','noon','1 pm','2 pm','3 pm','4 pm','5 pm'].map((t,i)=> (
                  <div key={i} className={`h-16 ${i===0?'mt-4':''}`}>{t}</div>
                ))}
              </div>
              {/* day cols */}
              {days.map((d,di)=> (
                <div key={di} className="border-l border-slate-200 relative cursor-pointer" onClick={(e)=>{
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top - 64; // subtract header band (~all day)
                  const slot = Math.max(0, Math.min(8*60, Math.round((y/64)*60))); // 9am base, 8 hours visible
                  const hours = 9 + Math.floor(slot/60);
                  const minutes = String(slot%60).padStart(2,'0');
                  setInitDate(toISODate(d)); setInitTime(`${String(hours).padStart(2,'0')}:${minutes}`); setInitialType('task'); setOpen(true);
                }}>
                  {/* events */}
                  {events.filter(e=> isSameDay(e.start,d)).map((e)=> (
                    <DraggableEvent key={e.id} event={e} lead={leadMap[e.lead_id]}
                      onDrop={async (newDate)=> { try{ await updateEventStart(e.id, newDate); setEvents(prev => prev.map(x => x.id===e.id ? { ...x, start: newDate } : x)); } catch(err){ alert(err?.message || 'Failed to update event'); } }}
                      onEdit={()=> setEditEvent(e)}
                    />
                  ))}
                  {/* NOW LINE */}
                  {isSameDay(new Date(), d) && (
                    <div id="cal-now-line" className="absolute left-0 right-0 h-px bg-rose-500" style={{ top: posY(new Date()) }} />
                  )}
                </div>
              ))}
            </div>
          </div>
          ) : (
            <MonthGrid days={monthDays} monthStart={monthStart} events={events} leads={leadMap}
              onNew={(d)=> { setInitDate(toISODate(d)); setInitTime('10:00'); setInitialType('task'); setOpen(true); }}
              onEdit={(e)=> setEditEvent(e)}
              onMove={async (evObj, newDate)=>{
                try{ await updateEventStart(evObj.id, newDate); setEvents(prev => prev.map(x => x.id===evObj.id ? { ...x, start: newDate } : x)); }
                catch(err){ alert(err?.message || 'Failed to update event'); }
              }}
            />
          )}
        </div>
      </div>

      <CalendarWizard open={open} onClose={()=> setOpen(false)} onCreated={()=> load()} initialType={initialType} initialDate={initDate} initialTime={initTime} />
      <QuickEventEditModal open={!!editEvent} event={editEvent} lead={editEvent ? leadMap[editEvent.lead_id] : null}
        onClose={()=> setEditEvent(null)} onSaved={()=> { setEditEvent(null); load(); }} />
    </div>
  );
}

function startOfWeek(d){ const x=new Date(d); const day=x.getDay(); const diff=(day===0?6:day-1); x.setDate(x.getDate()-diff); x.setHours(0,0,0,0); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function addMonths(d,n){ const x=new Date(d); x.setMonth(x.getMonth()+n); x.setDate(1); x.setHours(0,0,0,0); return x; }
function startOfMonth(d){ const x=new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }
function isSameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function toISODate(d){ return new Date(d).toISOString().slice(0,10); }
function getWeekNumber(d){ const target=new Date(d); target.setHours(0,0,0,0); target.setDate(target.getDate()+3-((target.getDay()+6)%7)); const first=new Date(target.getFullYear(),0,4); return 1+Math.round(((target-first)/86400000-3+((first.getDay()+6)%7))/7); }
function posY(date){ const h=date.getHours(); const m=date.getMinutes(); const base=64; const offset=(h-9)*64 + (m/60)*64; return `${Math.max(0, base + offset)}px`; }
function fmtTime(date){ return date.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); }
function eventStyle(kind){
  if (kind==='reminder') return { background:'#FEF9C3', border:'1px solid #fde047' };
  if (kind==='schedule') return { background:'#FEE2E2', border:'1px solid #fca5a5' };
  // task/default
  return { background:'#DCFCE7', border:'1px solid #86efac' };
}

function DraggableEvent({ event, onDrop, onEdit, lead }){
  const [dragging, setDragging] = useState(false);
  const [top, setTop] = useState(posY(event.start));
  return (
    <div
      className={`absolute left-2 right-2 rounded-xl p-2 text-xs shadow transition-shadow ${dragging ? 'opacity-80 shadow-md' : 'hover:shadow-md'}`}
      style={{ top, height: '64px', ...eventStyle(event.kind) }}
      title={event.title}
      onMouseDown={(e)=>{ e.stopPropagation(); setDragging(true); const startY=e.clientY; const startX=e.clientX; const startTop=posY(event.start); const dayWidth=(e.currentTarget.parentElement?.getBoundingClientRect()?.width)||120; const gridEl=document.getElementById('calendar-grid'); const gridRect=gridEl ? gridEl.getBoundingClientRect() : null; const onMove=(ev)=>{ const dy=ev.clientY-startY; setTop(`calc(${startTop} + ${dy}px)`); }; const onUp=(ev)=>{ document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); setDragging(false); const dy=ev.clientY-startY; const dx=ev.clientX-startX; // compute time + day offsets
        const minutes=Math.round((dy/64)*60); const dayOffset=Math.max(-6, Math.min(6, Math.round(dx/Math.max(1, dayWidth)))); const dt=new Date(event.start); dt.setMinutes(dt.getMinutes()+minutes); if (dayOffset) dt.setDate(dt.getDate()+dayOffset); onDrop?.(dt); }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); }}
      onTouchStart={(e)=>{ e.stopPropagation(); setDragging(true); const startY=e.touches[0].clientY; const startX=e.touches[0].clientX; const startTop=posY(event.start); const dayWidth=(e.currentTarget.parentElement?.getBoundingClientRect()?.width)||120; const onMove=(ev)=>{ const dy=ev.touches[0].clientY-startY; setTop(`calc(${startTop} + ${dy}px)`); }; const onEnd=(ev)=>{ document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onEnd); setDragging(false); const end = (ev.changedTouches && ev.changedTouches[0]) || { clientX:startX, clientY:startY }; const dy=end.clientY-startY; const dx=end.clientX-startX; const minutes=Math.round((dy/64)*60); const dayOffset=Math.max(-6, Math.min(6, Math.round(dx/Math.max(1, dayWidth)))); const dt=new Date(event.start); dt.setMinutes(dt.getMinutes()+minutes); if (dayOffset) dt.setDate(dt.getDate()+dayOffset); onDrop?.(dt); }; document.addEventListener('touchmove', onMove, { passive:false }); document.addEventListener('touchend', onEnd); }}
      onClick={(e)=>{ e.stopPropagation(); if (!dragging) onEdit?.(); }}
    >
      <div className="font-medium truncate">{event.title} {event.note ? <span title="Has notes">📝</span> : null}</div>
      <div className="mt-1 flex items-center justify-between">
        <div className="inline-flex items-center gap-1">
          {lead && <AvatarCircle name={lead.name||lead.plate||'Lead'} />}
          <span className="text-[11px] rounded-full px-2 py-0.5 bg-white/60 text-slate-700 border border-white/70">{event.kind}</span>
        </div>
        <div className="text-[11px] text-slate-700">{fmtTime(new Date(event.start))}</div>
      </div>
    </div>
  );
}

async function updateEventTime(id, newDate){
  try { await updateEventStart(id, newDate); }
  catch(e){ alert(e?.message || 'Failed to update event'); }
}

function AvatarCircle({ name }){
  const init = (name||'U').split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase();
  return <span className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]" title={name}>{init}</span>;
}

function QuickEventEditModal({ open, event, lead, onClose, onSaved }){
  const [title, setTitle] = useState(event?.title || '');
  const [kind, setKind] = useState(event?.kind || 'task');
  const [time, setTime] = useState(event ? toTime(event.start) : '10:00');
  const [note, setNote] = useState(event?.note || '');
  const [reminder, setReminder] = useState(typeof event?.reminder_minutes === 'number' ? event.reminder_minutes : 15);
  const [confirmOpen, setConfirmOpen] = useState(false);
  useEffect(()=>{
    if (open){
      setTitle(event?.title||'');
      setKind(event?.kind||'task');
      setTime(event ? toTime(event.start) : '10:00');
      setNote(event?.note || '');
      setReminder(typeof event?.reminder_minutes === 'number' ? event.reminder_minutes : 15);
    }
  }, [open, event]);
  if (!open) return null;
  const save = async ()=>{
    try{
      const dateStr = toISODate(event.start);
      const at = new Date(`${dateStr}T${time}:00`);
      await supabase.from('calendar_events').update({ title, kind, start_at: at.toISOString(), note, reminder_minutes: reminder }).eq('id', event.id);
      onSaved?.();
    } catch(e){ alert(e?.message || 'Failed to update'); }
  };
  const remove = ()=> setConfirmOpen(true);
  return (
    <div className="fixed inset-0 z-[95] bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-medium">Edit Event</div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="p-4 space-y-3 text-sm">
          {lead && <div className="text-slate-600">Lead: <span className="font-medium">{lead.name || lead.plate}</span></div>}
          <div>
            <div className="text-slate-600 mb-1">Title</div>
            <input className="input w-full" value={title} onChange={(e)=> setTitle(e.target.value)} />
          </div>
          <div>
            <div className="text-slate-600 mb-1">Type</div>
            <select className="input w-full" value={kind} onChange={(e)=> setKind(e.target.value)}>
              <option value="task">task</option>
              <option value="schedule">schedule</option>
              <option value="reminder">reminder</option>
            </select>
          </div>
          <div>
            <div className="text-slate-600 mb-1">Time</div>
            <input type="time" className="input w-full" value={time} onChange={(e)=> setTime(e.target.value)} />
          </div>
          <div>
            <div className="text-slate-600 mb-1">Reminder</div>
            <select className="input w-full" value={String(reminder)} onChange={(e)=> setReminder(parseInt(e.target.value, 10))}>
              <option value="0">No reminder</option>
              <option value="5">5 minutes before</option>
              <option value="10">10 minutes before</option>
              <option value="15">15 minutes before</option>
              <option value="30">30 minutes before</option>
              <option value="60">1 hour before</option>
              <option value="120">2 hours before</option>
              <option value="1440">1 day before</option>
            </select>
          </div>
          <div>
            <div className="text-slate-600 mb-1">Notes</div>
            <textarea className="input w-full min-h-[90px]" value={note} onChange={(e)=> setNote(e.target.value)} placeholder="Add details or notes here..." />
          </div>
        </div>
        <div className="px-4 py-3 border-t flex items-center justify-between gap-2">
          <button className="px-3 py-2 rounded border border-red-200 text-red-700" onClick={remove}>Delete</button>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded border" onClick={onClose}>Cancel</button>
            <button className="px-3 py-2 rounded bg-gray-900 text-white" onClick={save}>Save</button>
          </div>
        </div>
      </div>
      {/* Confirm delete modal */}
      {confirmOpen && (
        <ConfirmModal
          title="Delete Event"
          message="Are you sure you want to delete this event? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onCancel={()=> setConfirmOpen(false)}
          onConfirm={async ()=>{
            try{
              await supabase.from('calendar_events').delete().eq('id', event.id);
              setConfirmOpen(false);
              onSaved?.();
            } catch(e){ alert(e?.message || 'Failed to delete'); }
          }}
        />
      )}
    </div>
  );
}

function toTime(d){ try{ const x=new Date(d); return String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0'); }catch{return '10:00'} }

function buildMonthGrid(monthStart){
  const first = startOfWeek(startOfMonth(monthStart));
  const days = [];
  for (let i=0; i<42; i++) days.push(addDays(first, i));
  return days;
}

function MonthGrid({ days, monthStart, events, leads, onNew, onEdit, onMove }){
  // events by day
  const byDay = {};
  for (const e of events||[]){ const k = toISODate(e.start); (byDay[k] ||= []).push(e); }
  return (
    <div className="bg-white rounded-2xl border border-gray-200">
      <div className="grid grid-cols-7 gap-2 p-2">
        {days.map((d, i)=>{
          const key = toISODate(d);
          const items = (byDay[key] || []).slice(0,3);
          const extra = (byDay[key] || []).length - items.length;
          const isOtherMonth = d.getMonth() !== monthStart.getMonth();
          return (
            <div key={i} className={`rounded-xl p-2 h-24 md:h-28 lg:h-32 border ${isOtherMonth ? 'bg-slate-50 text-slate-400' : 'bg-white'} border-gray-100 flex flex-col`}
              onClick={()=> onNew?.(d)}
              onDragOver={(ev)=> ev.preventDefault()}
              onDrop={(ev)=>{
                ev.preventDefault();
                const id = ev.dataTransfer.getData('text/event-id');
                if (!id) return;
                const evObj = (events||[]).find(x=> String(x.id)===String(id));
                if (!evObj) return;
                const newDate = new Date(evObj.start);
                newDate.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                onMove?.(evObj, newDate);
              }}
            >
              <div className={`text-xs font-medium ${isOtherMonth ? 'text-slate-400' : 'text-slate-700'}`}>{d.getDate()}</div>
              <div className="mt-1 space-y-1 overflow-hidden">
                {items.map((e,ei)=> (
                  <button key={ei} className="w-full text-left text-[11px] truncate rounded-full px-2 py-1 border cursor-grab shadow-sm hover:shadow-md transition-shadow" style={eventStyle(e.kind)}
                    draggable
                    onDragStart={(ev)=>{ ev.dataTransfer.setData('text/event-id', String(e.id)); ev.dataTransfer.effectAllowed='move'; }}
                    onClick={(ev)=> { ev.stopPropagation(); onEdit?.(e); }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {leads[e.lead_id] && <span className="h-4 w-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px]">{(leads[e.lead_id].name||leads[e.lead_id].plate||'U').slice(0,2).toUpperCase()}</span>}
                      <span className="truncate">{e.title} {e.note ? '📝' : ''}</span>
                    </span>
                  </button>
                ))}
                {extra > 0 && <div className="text-[11px] text-slate-500">+{extra} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConfirmModal({ title='Confirm', message, confirmText='OK', cancelText='Cancel', onConfirm, onCancel }){
  return (
    <div className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden" onClick={(e)=> e.stopPropagation()}>
        <div className="px-4 py-3 border-b font-medium">{title}</div>
        <div className="p-4 text-sm text-slate-700">{message}</div>
        <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
          <button className="px-3 py-2 rounded border" onClick={onCancel}>{cancelText}</button>
          <button className="px-3 py-2 rounded bg-red-600 text-white" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

function MiniSide({ open=false, onClose, onJump, onNew, days=[], events=[], weekStart=new Date(), onFetchWeek }){
  // light, colorful summary sidebar
  const today = new Date();
  const lastWeekStart = addDays(weekStart, -7);
  const [lastWeekItems, setLastWeekItems] = useState([]);

  useEffect(()=>{
    let mounted = true;
    (async ()=>{
      try { if (onFetchWeek){ const rows = await onFetchWeek(lastWeekStart); if (mounted) setLastWeekItems(rows.slice(0,3)); } }
      catch { setLastWeekItems([]); }
    })();
    return ()=> { mounted = false; };
  }, [onFetchWeek, lastWeekStart]);

  const todayItems = (events||[])
    .filter(e => isSameDay(e.start, today))
    .sort((a,b)=> a.start - b.start)
    .slice(0,3);
  const thisWeekItems = (events||[]).slice(0,3).sort((a,b)=> a.start - b.start);

  return (
    <aside className={`md:static ${open ? 'block' : 'hidden'} md:block`}>      
      <div className="rounded-2xl shadow-sm border border-gray-100 p-3 sticky top-16"
        style={{ background: 'linear-gradient(180deg, rgba(183,224,195,.25) 0%, rgba(183,224,195,.10) 24%, rgba(255,255,255,.85) 100%)' }}
      >
        <div className="text-sm font-semibold text-slate-800 mb-3">Summary</div>
        <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
          <button className="px-3 py-2 rounded-lg bg-amber-50 text-amber-800 ring-1 ring-amber-200 text-sm text-left" onClick={()=> onJump?.(lastWeekStart)}>Last week</button>
          <button className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200 text-sm text-left" onClick={()=> onJump?.(weekStart)}>This week</button>
          <button className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 text-sm text-left" onClick={()=> onJump?.(today)}>Today</button>
        </div>

        {/* Today */}
        <div className="mt-4 text-sm font-medium text-slate-700">Today</div>
        <div className="mt-2 space-y-2">
          {todayItems.length === 0 ? (
            <div className="text-xs text-slate-500">No events</div>
          ) : todayItems.map((e,i)=> (
            <div key={i} className="rounded-xl p-2 text-xs ring-1 ring-gray-200 flex items-center justify-between" style={eventStyle(e.kind)}>
              <span className="truncate pr-2">{e.title}</span>
              <span className="text-slate-700">{fmtTime(new Date(e.start))}</span>
            </div>
          ))}
        </div>

        {/* This week quick create */}
        <div className="mt-4 text-sm font-medium text-slate-700">This week</div>
        <div className="mt-2 space-y-2">
          {days.slice(0,3).map((d,i)=> (
            <button key={i} className="w-full px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-left text-sm" onClick={()=> onNew?.(d)}>
              <div className="font-medium">Create event</div>
              <div className="text-xs text-slate-600">{d.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' })}</div>
            </button>
          ))}
        </div>

        {/* Last week preview */}
        <div className="mt-4 text-sm font-medium text-slate-700">Last week</div>
        <div className="mt-2 space-y-2">
          {lastWeekItems.length === 0 ? (
            <div className="text-xs text-slate-500">No events</div>
          ) : lastWeekItems.map((e,i)=> (
            <div key={i} className="rounded-xl p-2 text-xs ring-1 ring-gray-200 flex items-center justify-between" style={eventStyle(e.kind)}>
              <span className="truncate pr-2">{e.title}</span>
              <span className="text-slate-700">{fmtTime(new Date(e.start))}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
