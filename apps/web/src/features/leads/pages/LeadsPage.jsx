import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { getTenantId } from "../../../lib/tenant";
import LeadCard from "../components/LeadCard";
import LeadDrawer from "../components/LeadDrawer";
import AddLeadWizard from "../components/AddLeadWizard.jsx";
import {
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

const PAGE_SIZE = 12;
const STATUS_OPTIONS = ["all", "new", "contacted", "qualified", "won", "lost"];

export default function LeadsPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const offset = page * PAGE_SIZE;
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total]
  );

  async function load({ resetPage = false } = {}) {
    setLoading(true);
    setErr(null);
    try {
      const tenantId = getTenantId();
      let query = supabase
        .from("leads")
        .select("*", { count: "exact" })
        .eq("org_id", tenantId)
        .eq("archived", false);

      if (status && status !== "all") query = query.eq("status", status);

      if (q.trim()) {
        const term = q.trim();
        // name / email / phone contains
        query = query.or(
          `name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`
        );
      }

      const start = resetPage ? 0 : offset;
      const end = start + PAGE_SIZE - 1;

      const { data, error, count } = await query
        .order("updated_at", { ascending: false })
        .range(start, end);

      if (error) throw error;
      setRows(data || []);
      setTotal(count || 0);

      if (resetPage) setPage(0);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]); // re-run when page changes

  // Read status from URL on mount
  useEffect(()=>{
    try{
      const params = new URLSearchParams(window.location.search);
      const s = params.get('status');
      if (s && STATUS_OPTIONS.includes(s)) setStatus(s);
    }catch{}
  }, []);

  // Requery when filters change
  useEffect(() => {
    load({ resetPage: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function openDrawer(lead) {
    setSelected(lead);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function onChanged() {
    // refresh current page in-place
    load();
  }

  const canPrev = page > 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xl font-semibold">Leads</div>
          {loading && (
            <span className="text-xs text-slate-500 animate-pulse">
              loading…
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2 bg-white">
            <FiSearch className="text-slate-500" />
            <input
              className="outline-none text-sm min-w-[180px]"
              placeholder="Search name, email, phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") load({ resetPage: true });
              }}
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2 bg-white">
            <FiFilter className="text-slate-500" />
            <select
              className="text-sm outline-none bg-transparent"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <button
            className="icon-btn"
            title="Refresh"
            onClick={() => load({ resetPage: false })}
          >
            <FiRefreshCw />
          </button>
          <button className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm" onClick={()=> setAddOpen(true)}>+ Add Lead</button>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="card p-3 bg-red-50 border-red-200 text-red-700 text-sm">
          {err}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onView={openDrawer}        // single click opens drawer (LeadCard calls onView)
            onEdit={openDrawer}        // edit icon also opens drawer
            onAfterChange={onChanged}  // when actions occur, refresh page
          />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-slate-600">
          {total.toLocaleString()} total • Page {page + 1} of {pageCount}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="icon-btn"
            disabled={!canPrev}
            onClick={() => canPrev && setPage((p) => p - 1)}
            title="Previous"
          >
            <FiChevronLeft />
          </button>
          <button
            className="icon-btn"
            disabled={!canNext}
            onClick={() => canNext && setPage((p) => p + 1)}
            title="Next"
          >
            <FiChevronRight />
          </button>
        </div>
      </div>

      {/* Drawer mounted at page level */}
      <LeadDrawer
        open={drawerOpen}
        lead={selected}
        onClose={closeDrawer}
        onChanged={onChanged}
      />
      <AddLeadWizard open={addOpen} onClose={()=> setAddOpen(false)} onCreated={()=> load({ resetPage: true })} />
    </div>
  );
}
