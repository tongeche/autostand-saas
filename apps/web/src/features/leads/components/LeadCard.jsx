import { useState, useMemo, useRef, useEffect } from "react";
import {
  FiEdit2, FiPhone, FiEye, FiMail, FiMoreVertical,
  FiCalendar, FiSend, FiExternalLink, FiCopy
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import {
  addNote, addTask, changeStatus, deleteLead, logContact
} from "../services/supabase";
import { supabase } from "../../../lib/supabase";
import { getTenantId } from "../../../lib/tenant";

function Badge({ className = "", children }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${className}`}>
      {children}
    </span>
  );
}

const STATUS_STYLES = {
  new:        "bg-slate-100 text-slate-700",
  contacted:  "bg-accent/50 text-primary",
  qualified:  "bg-accent/70 text-primary",
  won:        "bg-green-100 text-green-700",
  lost:       "bg-red-100 text-red-700",
  default:    "bg-slate-100 text-slate-700",
};

export default function LeadCard({ lead, onEdit, onView, onAfterChange }) {
  const { id, name, email, phone, status, archived, meta, source, plate } = lead || {};
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notePreview, setNotePreview] = useState(null);
  const menuRef = useRef(null);

  const telHref  = phone ? `tel:${phone}`   : null;
  const mailHref = email ? `mailto:${email}`: null;

  const statusClass = useMemo(
    () => STATUS_STYLES[(status || "").toLowerCase()] || STATUS_STYLES.default,
    [status]
  );

  // close menu on outside click
  useEffect(() => {
    function onDocClick(e){ if(menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
    if(menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  // fetch latest note for this lead (one line preview)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("lead_notes")
          .select("body, created_at")
          .eq("tenant_id", getTenantId())
          .eq("lead_id", id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (!cancelled && !error && data && data[0]) {
          setNotePreview(String(data[0].body || "").split("\n")[0]);
        }
      } catch (_e) {}
    })();
    return () => { cancelled = true; };
  }, [id]);

  // ===== actions =====
  const handleEdit = async () => {
    if (onEdit) return onEdit(lead);
    const s = prompt("Update status:", status || "new");
    if (!s) return;
    try { setBusy(true); await changeStatus(id, s); onAfterChange?.("status_change"); }
    finally { setBusy(false); }
  };

  const handleWhatsApp = async () => {
    if (!phone) return alert("No phone number");
    const waLink = `https://wa.me/${phone.replace(/\D/g, "")}`;
    await logContact(id, "sms", { payload: { whatsapp: phone } });
    window.open(waLink, "_blank");
  };

  const handleCall = async () => {
    if (!telHref) return alert("No phone number");
    await logContact(id, "call", { payload: { number: phone } });
    window.location.href = telHref;
  };

  const handleEmail = async () => {
    if (!mailHref) return alert("No email");
    await logContact(id, "email", { payload: { email } });
    window.location.href = mailHref;
  };

  const handleView = () => {
    if (onView) return onView(lead);
    console.log("Open lead detail:", id);
  };

  const addNoteQuick = async () => {
    const body = prompt("Add note:");
    if (!body) return;
    try { setBusy(true); await addNote(id, body); onAfterChange?.("note"); setNotePreview(body.split("\n")[0]); }
    finally { setBusy(false); }
  };

  const addTaskQuick = async () => {
    const title = prompt("New task title:");
    if (!title) return;
    try { setBusy(true); await addTask(id, title); onAfterChange?.("task_create"); }
    finally { setBusy(false); }
  };

  const hardDelete = async () => {
    if (!confirm("Delete lead? This cannot be undone.")) return;
    try { setBusy(true); await deleteLead(id); onAfterChange?.("delete"); }
    finally { setBusy(false); }
  };

  const IconBtn = ({ onClick, label, children }) => (
    <button
      className="icon-btn disabled:opacity-50"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      title={label}
      type="button"
    >
      {children}
    </button>
  );

  // body line: SOURCE only (no label). Fallback to meta or placeholder.
  const sourceText = (source || meta?.source || "Unknown").toString();

  // menu stubs
  const scheduleMeeting = () => alert("Schedule (todo)");
  const sendAssetDetails = () => alert("Send car/asset details (todo)");
  const viewAsset = () => alert("View asset (todo: link to car ID)");

  const copyPlate = async () => {
    if (!plate) return;
    try {
      await navigator.clipboard?.writeText(plate);
      setMenuOpen(false);
    } catch {
      setMenuOpen(false);
      alert(`Plate: ${plate}`);
    }
  };

  return (
    <div
      className="card p-4"
      onDoubleClick={handleView}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") handleView(); }}
    >
      {/* Header: name + actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold leading-6 truncate">{name || "Unnamed lead"}</div>
          {/* minimal spacing; source line with NO label */}
          <div className="mt-1 text-[13px] text-slate-800 font-medium truncate">
            {sourceText}
          </div>
          {/* notes preview (single line) */}
          <div className="mt-1 text-[12px] text-slate-600 truncate">
            {notePreview ? `Note: ${notePreview}` : "No notes yet"}
          </div>
        </div>

        <div className="relative flex items-center gap-2">
          <IconBtn onClick={handleEdit}     label="Edit"><FiEdit2 /></IconBtn>
          <IconBtn onClick={handleWhatsApp} label="WhatsApp"><FaWhatsapp className="text-green-600" /></IconBtn>
          <IconBtn onClick={handleCall}     label="Call"><FiPhone /></IconBtn>
           <IconBtn onClick={handleView}     label="View"><FiEye /></IconBtn>
          <IconBtn onClick={() => setMenuOpen(v => !v)} label="More">
            <FiMoreVertical />
          </IconBtn>

          {menuOpen && (
            <div ref={menuRef} className="absolute right-0 top-10 z-10 card p-2 text-sm w-56">
              <button className="w-full text-left px-2 py-1 rounded hover:bg-slate-50"
                onClick={() => { setMenuOpen(false); scheduleMeeting(); }}>
                <span className="inline-flex items-center gap-2"><FiCalendar/> Schedule</span>
              </button>
              <button className="w-full text-left px-2 py-1 rounded hover:bg-slate-50"
                onClick={() => { setMenuOpen(false); sendAssetDetails(); }}>
                <span className="inline-flex items-center gap-2"><FiSend/> Send asset details</span>
              </button>
              <button className="w-full text-left px-2 py-1 rounded hover:bg-slate-50"
                onClick={() => { setMenuOpen(false); viewAsset(); }}>
                <span className="inline-flex items-center gap-2"><FiExternalLink/> View asset</span>
              </button>

              {/* Plate (copy to clipboard) */}
              {plate && (
                <button className="w-full text-left px-2 py-1 rounded hover:bg-slate-50"
                  onClick={copyPlate}>
                  <span className="inline-flex items-center gap-2"><FiCopy/> Plate: {plate}</span>
                </button>
              )}

              <div className="my-1 h-px bg-slate-100" />

              <button className="w-full text-left px-2 py-1 rounded hover:bg-slate-50"
                onClick={() => { setMenuOpen(false); handleEdit(); }}>
                Change status
              </button>

              <div className="my-1 h-px bg-slate-100" />

              <button className="w-full text-left px-2 py-1 rounded hover:bg-red-50 text-red-600"
                onClick={() => { setMenuOpen(false); hardDelete(); }}>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Status badge first, then actions; no date, no archive */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="ml-auto flex flex-wrap gap-2">
          <Badge className={statusClass}>{(status || "new")}</Badge>
          <button className="icon-btn text-xs" disabled={busy} onClick={addNoteQuick}>+ Note</button>
          <button className="icon-btn text-xs" disabled={busy} onClick={addTaskQuick}>+ Task</button>
          <button className="icon-btn text-xs" disabled={busy} onClick={hardDelete}>Delete</button>
        </div>
      </div>
    </div>
  );
}
