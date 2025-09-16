import React, { useEffect, useState } from "react";
import { FiBell, FiCalendar, FiClock, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { listDeliverable, listRecentRead, markAllRead, markRead } from "../services/notifications";

export default function NotificationDrawer({ open, onClose }){
  const [tab, setTab] = useState('unread');
  const [unread, setUnread] = useState([]);
  const [read, setRead] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(()=>{
    if (!open) return;
    (async ()=>{
      try{
        const [u, r] = await Promise.all([
          listDeliverable({ onlyUnread:true, limit: 50 }),
          listRecentRead({ limit: 50 })
        ]);
        setUnread(u||[]); setRead(r||[]);
      }catch{}
    })();
  }, [open]);

  async function doMarkAll(){
    try{ setBusy(true); await markAllRead(); const u = await listDeliverable({ onlyUnread:true, limit:50 }); setUnread(u||[]); try{ window.dispatchEvent(new Event('autostand:notifs:changed')); }catch{} }
    finally{ setBusy(false); }
  }

  const items = tab === 'unread' ? unread : read;

  return !open ? null : (
    <div className="fixed inset-0 z-[120]" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl rounded-l-2xl flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="text-lg font-semibold">Notifications</div>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="px-4 pt-3">
          <div className="inline-flex rounded-xl border overflow-hidden text-sm">
            <button className={`px-3 py-1.5 ${tab==='unread'?'bg-slate-900 text-white':''}`} onClick={()=> setTab('unread')}>Unread ({unread.length})</button>
            <button className={`px-3 py-1.5 ${tab==='read'?'bg-slate-900 text-white':''}`} onClick={()=> setTab('read')}>Read ({read.length})</button>
          </div>
        </div>
        {tab==='unread' && (
          <div className="px-4 mt-3">
            <button className="px-3 py-2 rounded-lg border bg-white text-sm disabled:opacity-50 hover:bg-slate-50" disabled={busy || unread.length===0} onClick={doMarkAll}>Mark all as read</button>
          </div>
        )}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-sm text-slate-500">No {tab==='unread' ? 'unread' : 'recent'} notifications</div>
          ) : items.map(n => (
            <NotifCard key={n.id} n={n} onMark={async()=>{ await markRead(n.id); if (tab==='unread'){ setUnread(prev=> prev.filter(x=> x.id!==n.id)); try{ window.dispatchEvent(new Event('autostand:notifs:changed')); }catch{} } }} />
          ))}
        </div>
      </aside>
    </div>
  );
}

function NotifCard({ n, onMark }){
  const t = tone(n?.kind, n?.title, n?.body);
  const Icon = t.icon;
  return (
    <div className={`rounded-2xl border ${t.border} bg-white shadow-sm overflow-hidden`}>      
      <div className="p-3 flex items-start gap-3">
        <div className={`h-9 w-9 rounded-full grid place-items-center ${t.iconBg} ${t.iconRing}`}><Icon className={t.iconFg}/></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium truncate">{n.title || 'Notification'}</div>
              {n.body && <div className="text-sm text-slate-600 mt-0.5 line-clamp-2">{n.body}</div>}
            </div>
            <span className={`text-[11px] ${t.badgeBg} ${t.badgeFg} px-2 py-0.5 rounded-full shrink-0`}>{(n.kind||'').replace(/_/g,' ')||'note'}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <div className="inline-flex items-center gap-2">
              <FiCalendar className="text-slate-400"/>
              <span>{new Date(n.deliver_at).toLocaleString()}</span>
            </div>
            {!n.read && <button className={`underline ${t.link}`} onClick={onMark}>Mark read</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function tone(kind='', title='', body=''){
  const k = String(kind||'').toLowerCase();
  const txt = `${title||''} ${body||''}`.toLowerCase();
  // classify
  const isSuccess = /success|conclu|completed|done/.test(txt);
  const isWarn    = /remind|due|soon/.test(k) || /remind|due/.test(txt);
  const isError   = /fail|error|unable|denied/.test(txt);
  if (isSuccess) return {
    icon: FiCheckCircle,
    border:'border-l-4 border-l-emerald-500',
    iconBg:'bg-emerald-50', iconRing:'ring-1 ring-emerald-200', iconFg:'text-emerald-700',
    badgeBg:'bg-emerald-100', badgeFg:'text-emerald-800', link:'text-emerald-800',
  };
  if (isError) return {
    icon: FiAlertCircle,
    border:'border-l-4 border-l-rose-500',
    iconBg:'bg-rose-50', iconRing:'ring-1 ring-rose-200', iconFg:'text-rose-700',
    badgeBg:'bg-rose-100', badgeFg:'text-rose-800', link:'text-rose-800',
  };
  if (k.includes('event') || /schedule|calendar/.test(txt)) return {
    icon: FiCalendar,
    border:'border-l-4 border-l-sky-500',
    iconBg:'bg-sky-50', iconRing:'ring-1 ring-sky-200', iconFg:'text-sky-700',
    badgeBg:'bg-sky-100', badgeFg:'text-sky-800', link:'text-sky-800',
  };
  if (isWarn || k.includes('task')) return {
    icon: FiClock,
    border:'border-l-4 border-l-amber-500',
    iconBg:'bg-amber-50', iconRing:'ring-1 ring-amber-200', iconFg:'text-amber-700',
    badgeBg:'bg-amber-100', badgeFg:'text-amber-800', link:'text-amber-800',
  };
  return {
    icon: FiBell,
    border:'border-l-4 border-l-slate-400',
    iconBg:'bg-slate-50', iconRing:'ring-1 ring-slate-200', iconFg:'text-slate-700',
    badgeBg:'bg-slate-100', badgeFg:'text-slate-700', link:'text-slate-700',
  };
}
