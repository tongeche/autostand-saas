import React, { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  FiUsers, FiCheckSquare, FiGrid, FiBox, FiSearch, FiMenu, FiCalendar, FiFileText, FiSettings
} from "react-icons/fi";
import AddLeadWizard from "../features/leads/components/AddLeadWizard.jsx";
import QuickTaskModal from "../features/todos/components/QuickTaskModal.jsx";
import FindAssetModal from "../features/inventory/components/FindAssetModal.jsx";
import { supabase } from "../lib/supabase";
import { useSupabaseSession } from "../lib/auth";

/** CONFIG */
const DEBUG = false; // flip to true to see mode/open badges in the topbar
const DESKTOP_MQ = "(min-width: 768px)"; // md breakpoint

/** Hook: breakpoint as a true boolean, not CSS classes */
function useIsDesktop() {
  const getMatch = () => typeof window !== "undefined" && window.matchMedia(DESKTOP_MQ).matches;
  const [isDesktop, setIsDesktop] = useState(getMatch());
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(DESKTOP_MQ);
    const handler = (e) => setIsDesktop(e.matches);
    if (mql.addEventListener) mql.addEventListener("change", handler);
    else mql.addListener(handler); // Safari fallback
    setIsDesktop(mql.matches);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", handler);
      else mql.removeListener(handler);
    };
  }, []);
  return isDesktop;
}

export default function Layout() {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();

  // Sidebar open state for desktop — default to true only on desktop
  const [open, setOpen] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(DESKTOP_MQ).matches ? true : false
  );

  // Mobile drawer open state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const plusRef = useRef(null);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);
  const [quickDefaults, setQuickDefaults] = useState({ title: "", due: null });
  const [findAssetOpen, setFindAssetOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const session = useSupabaseSession();
  const [orgName, setOrgName] = useState("");
  const [profile, setProfile] = useState({ avatar_url: "", full_name: "", email: "" });
  // If logged in but has no memberships, redirect to onboard (client-side check)
  useEffect(()=>{
    (async ()=>{
      if (!session) return;
      try{
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id; if (!uid) return;
        const { data: ms } = await supabase
          .from('org_members')
          .select('org_id')
          .eq('user_id', uid)
          .limit(1);
        if (!ms || ms.length === 0){
          // avoid redirect loop if already on onboard/login/signup
          const path = window.location.pathname;
          if (!/\/onboard|\/login|\/signup/.test(path)) navigate('/onboard');
        }
        // Persist current org in localStorage for data filters
        try { window.localStorage.setItem('org_id', ms[0].org_id); } catch {}
      }catch{}
    })();
  }, [session, navigate]);

  // Fetch current org name (brand_name if available) for header branding
  useEffect(()=>{
    (async ()=>{
      try{
        if (!session) { setOrgName(""); return; }
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id; if (!uid) { setOrgName(""); return; }
        // Load profile for avatar/name
        try {
          const email = userData?.user?.email || "";
          const metaAvatar = userData?.user?.user_metadata?.avatar_url || "";
          const { data: p } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', uid)
            .maybeSingle();
          setProfile({ avatar_url: p?.avatar_url || metaAvatar || "", full_name: p?.full_name || "", email });
        } catch {}
        const { data: ms } = await supabase
          .from('org_members')
          .select('org_id, orgs(name)')
          .eq('user_id', uid)
          .order('joined_at', { ascending: true })
          .limit(1);
        if (!ms || !ms[0]) { setOrgName(""); return; }
        const orgId = ms[0].org_id;
        // Try brand first
        const { data: brand } = await supabase
          .from('org_settings')
          .select('brand_name')
          .eq('org_id', orgId)
          .maybeSingle();
        const name = (brand?.brand_name || ms[0]?.orgs?.name || "").trim();
        setOrgName(name);
      }catch{ setOrgName(""); }
    })();
  }, [session]);

  // When switching to desktop, close mobile drawer but do NOT change sidebar open state
  useEffect(() => {
    if (isDesktop && mobileOpen) {
      setMobileOpen(false);
      document.body.classList.remove("lock-scroll");
    }
  }, [isDesktop, mobileOpen]);

  // Lock body scroll only while mobile drawer is open
  useEffect(() => {
    const b = document.body;
    if (!isDesktop && mobileOpen) b.classList.add("lock-scroll");
    else b.classList.remove("lock-scroll");
    return () => b.classList.remove("lock-scroll");
  }, [isDesktop, mobileOpen]);

  // Close the plus dropdown on outside click / escape
  useEffect(() => {
    if (!plusOpen) return;
    const onDown = (e) => {
      if (!plusRef.current) return;
      if (!plusRef.current.contains(e.target)) setPlusOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setPlusOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [plusOpen]);

  // global open for Add Lead wizard
  useEffect(()=>{
    const fn = () => setAddLeadOpen(true);
    window.addEventListener('autostand:open_add_lead', fn);
    return () => window.removeEventListener('autostand:open_add_lead', fn);
  }, []);

  // global open for Quick Task
  useEffect(()=>{
    const fn = (e) => {
      const d = (e && e.detail) || {};
      setQuickDefaults({ title: d.title || '', due: d.due || null });
      setQuickTaskOpen(true);
    };
    window.addEventListener('autostand:open_quick_task', fn);
    return () => window.removeEventListener('autostand:open_quick_task', fn);
  }, []);

  /** Render */
  return (
    <div className="min-h-screen app-shell flex">
      {/* DESKTOP SIDEBAR (explicitly gated by isDesktop) */}
      {isDesktop && (
        <aside className={`${open ? "w-72" : "w-16"} sidebar transition-all duration-200 flex flex-col`}>
          <SidebarHeader open={open} onToggle={() => setOpen(v => !v)} orgName={orgName} />
          <SidebarNav open={open} />
          {open && <SidebarOnboarding />}
        </aside>
      )}

      {/* MOBILE DRAWER (explicitly gated by !isDesktop) */}
      {!isDesktop && (
        <>
          {mobileOpen && (
            <>
              <div
                className="mobile-overlay"
                onClick={() => setMobileOpen(false)}
                aria-hidden="true"
              />
              <aside
                className="fixed left-0 top-0 h-full w-80 sidebar safe p-0 flex flex-col z-50"
                role="dialog" aria-modal="true" aria-label="Mobile navigation"
              >
                <SidebarHeader open={true} onToggle={() => setMobileOpen(false)} closeLabel="×" />
                <SidebarNav open={true} onNavigate={() => setMobileOpen(false)} />
                <SidebarOnboarding />
              </aside>
            </>
          )}
        </>
      )}

      {/* MAIN COLUMN */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="topbar sticky top-0 z-40 safe">
          <div className="px-3 md:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isDesktop && (
                <button
                  className="icon-btn"
                  aria-label="Open menu"
                  onClick={() => setMobileOpen(true)}
                >
                  <FiMenu />
                </button>
              )}
              <div className="text-xl md:text-2xl font-semibold text-primary">Dashboard</div>
            </div>
            <div className="flex items-center gap-2">
              {DEBUG && (
                <span className="badge" style={{ background: "var(--color-primary-600)" }}>
                  {isDesktop ? "desktop" : "mobile"} | open:{String(open)}
                </span>
              )}
              <div className="relative" ref={plusRef}>
                <button className="icon-btn min-h-[40px]" onClick={()=> setPlusOpen(v=>!v)}>+</button>
                {plusOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border z-50">
                    <MenuItem label="Schedule" onClick={()=>{ setPlusOpen(false); setQuickDefaults({ title: 'Schedule', due: new Date(Date.now()+60*60*1000) }); setQuickTaskOpen(true); }} />
                    <MenuItem label="Add Task" onClick={()=>{ setPlusOpen(false); setQuickDefaults({ title: '', due: null }); setQuickTaskOpen(true); }} />
                    <MenuItem label="View Asset" onClick={()=>{ setPlusOpen(false); setFindAssetOpen(true); }} />
                    <MenuItem label="Add Inventory" onClick={()=>{ setPlusOpen(false); navigate('/inventory?import=1'); }} />
                    <MenuItem label="Add Lead" onClick={()=>{ setPlusOpen(false); setAddLeadOpen(true); }} />
                    <MenuItem label="Set Reminder" onClick={()=>{ setPlusOpen(false); setQuickDefaults({ title: 'Reminder', due: new Date(Date.now()+60*60*1000) }); setQuickTaskOpen(true); }} />
                    <MenuItem label="Calendar" onClick={()=>{ setPlusOpen(false); navigate('/todos?view=timeline'); }} />
                    <MenuItem label="Send PDF" onClick={()=>{ setPlusOpen(false); navigate('/wall?new=car'); }} />
                  </div>
                )}
              </div>
              {!session ? (
                <>
                  <button className="px-3 py-1.5 rounded-lg border bg-white text-sm" onClick={()=> navigate('/login')}>Sign in</button>
                  <button className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm" onClick={()=> navigate('/signup')}>Sign up</button>
                </>
              ) : (
              <div className="relative">
                  <button className="h-9 w-9 rounded-full border bg-white overflow-hidden" title={profile.email} onClick={()=> setUserMenuOpen(v=>!v)}>
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover"/>
                    ) : (
                      <span className="h-full w-full grid place-items-center text-sm font-medium text-slate-700">
                        {(profile.email || 'A').slice(0,1).toUpperCase()}
                      </span>
                    )}
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border z-50">
                      <div className="px-3 py-2 text-xs text-slate-600 truncate">{profile.email}</div>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={()=>{ setUserMenuOpen(false); navigate('/settings'); }}>Settings</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={()=>{ setUserMenuOpen(false); navigate('/settings'); }}>Manage account</button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={async ()=>{ setUserMenuOpen(false); try{ window.localStorage.removeItem('org_id'); }catch{} await supabase.auth.signOut(); navigate('/login'); }}>Logout</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content with max width on large screens */}
        <main className="p-3 md:p-6">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
        {/* Portaled-like modal at layout level */}
        {/** Lazy import kept simple to avoid Suspense here */}
        {addLeadOpen && (
          <AddLeadWizard open={addLeadOpen} onClose={()=> setAddLeadOpen(false)} onCreated={()=>{
            // optionally navigate to leads or toast
          }}/>
        )}
        {quickTaskOpen && (
          <QuickTaskModal open={quickTaskOpen} onClose={()=> setQuickTaskOpen(false)} onCreated={()=>{}} defaultTitle={quickDefaults.title} defaultDue={quickDefaults.due} />
        )}
        {findAssetOpen && (
          <FindAssetModal open={findAssetOpen} onClose={()=> setFindAssetOpen(false)} onFind={(q)=>{ setFindAssetOpen(false); navigate(`/inventory?q=${encodeURIComponent(q)}`); }} />
        )}
      </div>
    </div>
  );
}

function MenuItem({ label, onClick }){
  return (
    <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={onClick}>{label}</button>
  );
}

/* ───────── Sidebar pieces ───────── */

function SidebarHeader({ open, onToggle, closeLabel, orgName }) {
  return (
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="text-lg font-bold">{orgName || 'AutoStand'}</div>
        {open && !orgName && <span className="badge">v2</span>}
      </div>
      <button
        onClick={onToggle}
        className="icon-btn text-sm"
        aria-label={closeLabel || "Collapse sidebar"}
      >
        {closeLabel ? closeLabel : open ? "<" : ">"}
      </button>
    </div>
  );
}

function SidebarNav({ open, onNavigate }) {
  return (
    <>
      <div className="px-3 pb-2">
        {open && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500"><FiSearch /></span>
            <input className="input w-full" placeholder="Search..." />
          </div>
        )}
      </div>

      <nav className="p-2 text-[15px] font-medium space-y-1">
        <Item to="/dashboard" icon={<FiGrid />} label="Dashboard" open={open} onClick={onNavigate} />
        <Item to="/leads" icon={<FiUsers />} label="Leads" open={open} onClick={onNavigate} />
        <Item to="/todos" icon={<FiCheckSquare />} label="Tasks" open={open} onClick={onNavigate} />
        <Item to="/inventory" icon={<FiBox />} label="Inventory" open={open} onClick={onNavigate} />
        <Item to="/calendar" icon={<FiCalendar />} label="Calendar" open={open} onClick={onNavigate} />
        <Item to="/wall" icon={<FiFileText />} label="Documents" open={open} onClick={onNavigate} />
        <Item to="/settings" icon={<FiSettings />} label="Settings" open={open} onClick={onNavigate} />
      </nav>
    </>
  );
}

function SidebarOnboarding() {
  return (
    <div className="mt-auto p-3 text-xs text-slate-600">
      <NavLink to="/settings" className={({isActive})=>`card p-3 block ${isActive ? 'ring-1 ring-accent' : ''}`}>
        <div className="font-semibold text-primary">Onboarding</div>
        <div className="text-[12px] mt-1">Finish setup to unlock automations.</div>
      </NavLink>
    </div>
  );
}

function Item({ to, icon, label, open, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={() => onClick && onClick()}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2 transition
         ${isActive ? "bg-accent/40 text-primary" : "text-slate-700 hover:bg-white"}`
      }
    >
      <span className="text-slate-600">{icon}</span>
      {open && <span>{label}</span>}
    </NavLink>
  );
}
