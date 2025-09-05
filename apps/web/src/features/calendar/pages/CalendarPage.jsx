import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { FiChevronLeft, FiChevronRight, FiShare, FiCalendar } from "react-icons/fi";
import { listTenantLeadTasks } from "../../leads/services/supabase";
import { listEventsBetween, updateEventStart } from "../services/events";
import CalendarWizard from "../components/CalendarWizard.jsx";

export default function CalendarPage(){
  const location = useLocation();
  const [start, setStart] = useState(startOfWeek(new Date()));
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const [initialType, setInitialType] = useState('task');
  const [initDate, setInitDate] = useState(null);
  const [initTime, setInitTime] = useState(null);

  const days = useMemo(()=> Array.from({length:7}, (_,i)=> addDays(start,i)), [start]);

  async function load(){
    const from = days[0];
    const to = addDays(days[6], 1);
    try{
      const evs = await listEventsBetween({ from, to });
      const mapped = evs.map(e => ({ id:e.id, title:e.title||'(untitled)', start: new Date(e.start_at), kind: e.kind||'task' }));
      setEvents(mapped);
    } catch {
      // fallback: tasks mapping if events table not available
      const fromD = toISODate(days[0]);
      const toD = toISODate(days[6]);
      const { rows } = await listTenantLeadTasks({ onlyOpen:false, status:'all', limit:500, offset:0 });
      const inWeek = (rows||[]).filter(t => t.due_date && t.due_date >= fromD && t.due_date <= toD);
      const mapped = inWeek.map(t => ({ id:t.id, title:t.title||'(untitled)', start: new Date(`${t.due_date}T10:00:00`), kind: (t.status==='done'?'done':'task') }));
      setEvents(mapped);
    }
  }

  useEffect(()=>{ load(); }, [start]);
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

  const monthLabel = days[3].toLocaleString(undefined, { month:'long', year:'numeric' });
  const weekNumber = getWeekNumber(days[3]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-slate-700">
          <span className="text-lg md:text-xl font-semibold capitalize">{monthLabel}</span>
          <span className="text-slate-500">/ W{weekNumber}</span>
          <button className="icon-btn" onClick={()=> setStart(addDays(start,-7))}>←</button>
          <button className="icon-btn" onClick={()=> setStart(addDays(start,7))}>→</button>
        </div>
        <div className="inline-flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-lg border bg-white text-sm" onClick={()=> setStart(startOfWeek(new Date()))}>Today</button>
          <button className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm" onClick={()=> { setInitDate(toISODate(new Date())); setInitTime(null); setInitialType('task'); setOpen(true); }}>+ New</button>
        </div>
      </div>

      {/* Days header */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-8 gap-2 items-end text-sm min-w-[880px]">
          <div></div>
          {days.map((d,i)=> (
            <button key={i} className="text-center rounded hover:bg-slate-50 p-1" onClick={()=>{ setInitDate(toISODate(d)); setInitTime('10:00'); setInitialType('task'); setOpen(true); }}>
              <div className="text-slate-500">{d.toLocaleDateString(undefined,{ weekday:'short'})}</div>
              <div className="text-xl font-semibold">{d.getDate().toString().padStart(2,'0')}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-8 gap-2 min-h-[480px] min-w-[880px]">
        {/* time col */}
        <div className="text-right pr-2 text-slate-500 text-sm hidden sm:block">
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
            {events.filter(e=> isSameDay(e.start,d)).map((e,ei)=> (
              <DraggableEvent key={e.id} event={e} onDrop={(newDate)=> updateEventTime(e.id, newDate)} />
            ))}
          </div>
        ))}
        </div>
      </div>

      <CalendarWizard open={open} onClose={()=> setOpen(false)} onCreated={()=> load()} initialType={initialType} initialDate={initDate} initialTime={initTime} />
    </div>
  );
}

function startOfWeek(d){ const x=new Date(d); const day=x.getDay(); const diff=(day===0?6:day-1); x.setDate(x.getDate()-diff); x.setHours(0,0,0,0); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function isSameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function toISODate(d){ return new Date(d).toISOString().slice(0,10); }
function getWeekNumber(d){ const target=new Date(d); target.setHours(0,0,0,0); target.setDate(target.getDate()+3-((target.getDay()+6)%7)); const first=new Date(target.getFullYear(),0,4); return 1+Math.round(((target-first)/86400000-3+((first.getDay()+6)%7))/7); }
function posY(date){ const h=date.getHours(); const m=date.getMinutes(); const base=64; const offset=(h-9)*64 + (m/60)*64; return `${Math.max(0, base + offset)}px`; }
function fmtTime(date){ return date.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); }
function eventStyle(kind){
  if (kind==='reminder') return { background:'#FFF085', border:'1px solid #eab308' };
  if (kind==='schedule') return { background:'#FFC9C9', border:'1px solid #ef4444' };
  // task/default
  return { background:'#B9F8CF', border:'1px solid #10b981' };
}

function DraggableEvent({ event, onDrop }){
  const [dragging, setDragging] = useState(false);
  const [top, setTop] = useState(posY(event.start));
  return (
    <div
      className={`absolute left-2 right-2 rounded-md p-2 text-xs shadow ${dragging ? 'opacity-80' : ''}`}
      style={{ top, height: '64px', ...eventStyle(event.kind) }}
      title={event.title}
      onMouseDown={(e)=>{ setDragging(true); const startY=e.clientY; const startTop=posY(event.start); const onMove=(ev)=>{ const dy=ev.clientY-startY; setTop(`calc(${startTop} + ${dy}px)`); }; const onUp=(ev)=>{ document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); setDragging(false); const dy=ev.clientY-startY; const minutes=Math.round((dy/64)*60); const dt=new Date(event.start); dt.setMinutes(dt.getMinutes()+minutes); onDrop?.(dt); }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); }}
      onTouchStart={(e)=>{ setDragging(true); const startY=e.touches[0].clientY; const startTop=posY(event.start); const onMove=(ev)=>{ const dy=ev.touches[0].clientY-startY; setTop(`calc(${startTop} + ${dy}px)`); }; const onEnd=(ev)=>{ document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onEnd); setDragging(false); const endY = (ev.changedTouches && ev.changedTouches[0]?.clientY) || startY; const dy=endY-startY; const minutes=Math.round((dy/64)*60); const dt=new Date(event.start); dt.setMinutes(dt.getMinutes()+minutes); onDrop?.(dt); }; document.addEventListener('touchmove', onMove, { passive:false }); document.addEventListener('touchend', onEnd); }}
    >
      <div className="font-medium truncate">{event.title}</div>
      <div className="text-[11px] text-slate-600">{fmtTime(new Date(event.start))}</div>
    </div>
  );
}

async function updateEventTime(id, newDate){
  try { await updateEventStart(id, newDate); }
  catch(e){ alert(e?.message || 'Failed to update event'); }
}
