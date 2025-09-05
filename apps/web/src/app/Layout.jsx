import React, { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  FiUsers, FiCheckSquare, FiGrid, FiBox, FiSearch, FiMenu,
} from "react-icons/fi";

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

  // Sidebar open state for desktop — default to true only on desktop
  const [open, setOpen] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(DESKTOP_MQ).matches ? true : false
  );

  // Mobile drawer open state
  const [mobileOpen, setMobileOpen] = useState(false);

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

  /** Render */
  return (
    <div className="min-h-screen app-shell flex">
      {/* DESKTOP SIDEBAR (explicitly gated by isDesktop) */}
      {isDesktop && (
        <aside className={`${open ? "w-72" : "w-16"} sidebar transition-all duration-200 flex flex-col`}>
          <SidebarHeader open={open} onToggle={() => setOpen(v => !v)} />
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
              <button className="icon-btn min-h-[40px]">+</button>
              <span className="hidden sm:inline badge" style={{ background: "var(--color-primary-600)" }}>
                V2
              </span>
            </div>
          </div>
        </header>

        {/* Content with max width on large screens */}
        <main className="p-3 md:p-6">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

/* ───────── Sidebar pieces ───────── */

function SidebarHeader({ open, onToggle, closeLabel }) {
  return (
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="text-lg font-bold">AutoStand</div>
        {open && <span className="badge">v2</span>}
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
        <Item to="/wall" icon={<FiGrid />} label="Sticky Wall" open={open} onClick={onNavigate} />
      </nav>
    </>
  );
}

function SidebarOnboarding() {
  return (
    <div className="mt-auto p-3 text-xs text-slate-600">
      <div className="card p-3">
        <div className="font-semibold text-primary">Onboarding</div>
        <div className="text-[12px] mt-1">Finish setup to unlock automations.</div>
      </div>
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
