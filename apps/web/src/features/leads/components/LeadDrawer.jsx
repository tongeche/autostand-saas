import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RespondWizard } from "./respond_wizard";
import TaskWizard from "./TaskWizard";
import { fetchLeadTasks, fetchLeadActivity, fetchLeadNotes, createLeadTask, updateLeadTask, toggleLeadTaskDone, deleteLeadTask } from "../services/supabase";

import {
  FiX, FiSave, FiTrash2, FiPlus,
  FiFileText, FiClock, FiTag, FiInfo, FiExternalLink,
  FiMail, FiPhone, FiMessageSquare, FiBell
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { supabase } from "../../../lib/supabase";
import { getTenantId } from "../../../lib/tenant";
import {
  addNote, /* addTask, */ updateLead, changeStatus, deleteLead, logContact
} from "../services/supabase";

/* ────────────────── Theme helpers ────────────────── */
const tone = {
  chip: "rounded-full px-3 py-1.5 text-sm transition",
  soft: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  primary: "bg-accent/70 text-primary hover:bg-accent",
  success: "bg-green-100 text-green-700 hover:bg-green-200",
  warn: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  danger: "bg-red-100 text-red-700 hover:bg-red-200",
};

const STATUS_ORDER = ["new", "contacted", "qualified", "won", "lost"];
const STATUS_STYLES = {
  new:        "bg-slate-100 text-slate-800 hover:bg-slate-200",
  contacted:  "bg-accent/60 text-primary hover:bg-accent",
  qualified:  "bg-accent/80 text-primary hover:bg-accent",
  won:        "bg-green-100 text-green-700 hover:bg-green-200",
  lost:       "bg-red-100 text-red-700 hover:bg-red-200",
};
const statusClass = (s) => STATUS_STYLES[(s || "").toLowerCase()] || STATUS_STYLES.new;

/* ────────────────── Small building blocks ────────────────── */
function Section({ icon, title, right, children }) {
  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-slate-500">{icon}</span>
          <span>{title}</span>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function ActionChip({ icon, label, onClick, style = "soft" }) {
  const cls = `${tone.chip} ${tone[style] || tone.soft}`;
  return (
    <button type="button" onClick={onClick} className={cls}>
      <span className="inline-flex items-center gap-2">
        <span className="opacity-80">{icon}</span>
        <span className="font-medium">{label}</span>
      </span>
    </button>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <label className="text-sm">
      <div className="text-slate-600 mb-1 inline-flex items-center gap-2">
        <FiTag className="text-slate-500" />
        {label}
      </div>
      <input
        className="w-full rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/60"
        value={value || ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function List({ items, empty, render }) {
  if (!items || items.length === 0) return <div className="text-xs text-slate-500">{empty}</div>;
  return <div className="space-y-2">{items.map((it) => <div key={it.id}>{render(it)}</div>)}</div>;
}

function toLocalInputValue(iso) {
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ""; }
}

/* ────────────────── Drawer ────────────────── */
export default function LeadDrawer({ open, lead, onClose, onChanged }) {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const notesRef = useRef(null);

  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);
  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [lastContact, setLastContact] = useState(null);
  const [respondOpen, setRespondOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState('all'); // all | open | overdue
  const [assignee, setAssignee] = useState('auto');    // auto | owner | assigned | none
  const [taskWizardOpen, setTaskWizardOpen] = useState(false);

  // Load details when opening
  useEffect(() => {
    if (!open || !lead) return;
    setForm({
      name: lead.name || "",
      phone: lead.phone || "",
      email: lead.email || "",
      source: lead.source || "",
      plate: lead.plate || "",
      status: lead.status || "new",
    });
    (async () => {
      const [n, acts, t] = await Promise.all([
        fetchLeadNotes(lead.id),
        fetchLeadActivity(lead.id, { limit: 50 }),
        fetchLeadTasks(lead.id, { onlyOpen: taskFilter === 'open', overdue: taskFilter === 'overdue' })
      ]);
      setNotes(Array.isArray(n) ? n : []);
      const last = (acts || []).find(ev => ev.type === 'contact');
      setLastContact(last ? new Date(last.created_at) : null);
      setTasks(Array.isArray(t) ? t : []);
    })();
    // default assignee mode when opening lead
    setAssignee(lead?.owner_id ? 'owner' : (lead?.assignee_id ? 'assigned' : 'auto'));
  }, [open, lead, taskFilter]);

  // esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !lead) return null;

  /* ───────────── Utils ───────────── */
  const relTime = (d) => {
    if (!d) return "never";
    const diff = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
    if (diff < 60) return `${diff}s ago`;
    const m = Math.floor(diff / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);   if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24); return `${days}d ago`;
  };

  /* ───────────── Actions ───────────── */
  const save = async () => {
    try {
      setBusy(true);
      const patch = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        source: form.source.trim() || null,
        plate: form.plate.trim() || null,
        status: form.status,
      };
      await updateLead(lead.id, patch);
      onChanged?.("edit");
    } finally { setBusy(false); }
  };

  const setStatus = async (s) => {
    try {
      setBusy(true);
      await changeStatus(lead.id, s);
      setForm((f) => ({ ...f, status: s }));
      onChanged?.("status_change");
    } finally { setBusy(false); }
  };

  const addQuickNote = async () => {
    const body = prompt("Note:");
    if (!body) return;
    try {
      setBusy(true);
      const ins = await addNote(lead.id, body);
      setNotes((prev) => [ins, ...prev]);
      onChanged?.("note");
      setTimeout(() => notesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    } finally { setBusy(false); }
  };

  const hardDelete = async () => {
    if (!confirm("Delete lead? This cannot be undone.")) return;
    try { setBusy(true); await deleteLead(lead.id); onChanged?.("delete"); onClose?.(); }
    finally { setBusy(false); }
  };

  const contact = async (kind) => {
    if (kind === "phone" && form?.phone) {
      await logContact(lead.id, "call", { payload: { number: form.phone } });
      window.location.href = `tel:${form.phone}`;
    }
    if (kind === "email" && form?.email) {
      await logContact(lead.id, "email", { payload: { email: form.email } });
      window.location.href = `mailto:${form.email}`;
    }
    if (kind === "sms" && form?.phone) {
      await logContact(lead.id, "sms", { payload: { number: form.phone } });
      window.location.href = `sms:${form.phone}`;
    }
  };

  const openWhatsApp = async () => {
    if (!form?.phone) return alert("No phone number");
    const waLink = `https://wa.me/${String(form.phone).replace(/\D/g, "")}`;
    await logContact(lead.id, "sms", { payload: { whatsapp: form.phone } });
    window.open(waLink, "_blank");
  };

  const openReminder = () => alert("Reminder setup (todo)");
  const openSendPDF = () => {
    try {
      if (lead?.id) navigate(`/wall?new=car&lead=${lead.id}`);
      else navigate('/wall?new=car');
    } catch { setRespondOpen(true); }
  };
  const openSource = () => {
    const href = form?.source;
    if (!href) return;
    try {
      const url = href.startsWith("http") ? href : `https://${href}`;
      window.open(url, "_blank");
    } catch { /* noop */ }
  };

  return (
    <div className="fixed inset-0 z-40">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* panel */}
      <aside
        ref={panelRef}
        className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-xl border-l animate-in slide-in-from-right duration-200"
      >
        {/* header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold truncate">{lead.name || "Lead"}</div>
          <div className="flex items-center gap-2">
            <button className="icon-btn" title="Save" onClick={save} disabled={busy}><FiSave/></button>
            <button className="icon-btn" title="Close" onClick={onClose}><FiX/></button>
          </div>
        </div>

        {/* content */}
        <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-56px)]">

          {/* Status row (horizontal buttons) */}
          <Section icon={<FiTag />} title="Status">
            <div className="flex flex-wrap gap-2">
              {STATUS_ORDER.map((s) => {
                const active = (form?.status || "new") === s;
                const cls = `${tone.chip} ${statusClass(s)} ${active ? "ring-2 ring-accent/60" : ""}`;
                return (
                  <button
                    key={s}
                    type="button"
                    className={cls}
                    onClick={() => setStatus(s)}
                    disabled={busy}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Quick Access chips */}
          <Section icon={<FiInfo />} title="Quick Access">
            <div className="flex flex-wrap gap-2">
              <ActionChip icon={<FaWhatsapp />}     label="WhatsApp"     onClick={openWhatsApp} style="success" />
              <ActionChip icon={<FiExternalLink />} label="Source"       onClick={openSource}   style="primary" />
              <ActionChip icon={<FiFileText />}     label="Notes"        onClick={() => notesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} />
              <ActionChip icon={<FiFileText />}     label="Send PDF"     onClick={openSendPDF} />
              <ActionChip icon={<FiClock />}        label="Task"         onClick={()=> setTaskWizardOpen(true)} />
              <ActionChip icon={<FiTag />}          label={`Status: ${(form?.status || "new")}`} onClick={() => {}} />
              <ActionChip icon={<FiTag />}          label={`Plate: ${form?.plate || "—"}`} onClick={() => {
                if (!form?.plate) return;
                navigator.clipboard?.writeText(form.plate).catch(()=>{});
              }} />
              <ActionChip icon={<FiBell />}         label="Reminder"     onClick={openReminder} style="warn" />
            </div>
          </Section>

          {/* Contact shortcuts (chips) */}
          <Section icon={<FiMessageSquare />} title="Contact">
            <div className="flex flex-wrap gap-2">
              <ActionChip icon={<FiPhone />} label="Call"  onClick={() => contact("phone")} />
              <ActionChip icon={<FiMessageSquare />} label="SMS"   onClick={() => contact("sms")} />
              <ActionChip icon={<FiMail />}  label="Email" onClick={() => contact("email")} />
              <ActionChip icon={<FiClock />} label={`Last: ${relTime(lastContact)}`} onClick={() => {}} />
            </div>
          </Section>

          {/* Details */}
          <Section icon={<FiInfo />} title="Details">
            <div className="grid grid-cols-1 gap-3">
              <Input label="Name"   value={form?.name}  onChange={(v)=>setForm(f=>({...f,name:v}))}/>
              <Input label="Phone"  value={form?.phone} onChange={(v)=>setForm(f=>({...f,phone:v}))} placeholder="+351 …"/>
              <Input label="Email"  value={form?.email} onChange={(v)=>setForm(f=>({...f,email:v}))}/>
              <Input label="Source" value={form?.source} onChange={(v)=>setForm(f=>({...f,source:v}))} placeholder="https://…" />
              <Input label="Plate"  value={form?.plate} onChange={(v)=>setForm(f=>({...f,plate:v}))}/>
            </div>
          </Section>

          {/* Notes */}
          <div ref={notesRef}>
            <Section icon={<FiFileText />} title="Notes" right={
              <button className="icon-btn text-xs" onClick={addQuickNote} disabled={busy}><FiPlus/> Add</button>
            }>
              <List items={notes} empty="No notes yet" render={(n)=>(
                <div className="rounded-lg border border-slate-200 p-2 text-sm">
                  <div className="whitespace-pre-wrap">{n.body}</div>
                </div>
              )}/>
            </Section>
          </div>

          {/* Tasks — tenant + lead scoped */}
          <Section icon={<FiClock />} title="Tasks" right={
            <div className="flex items-center gap-2">
              {/* Filter */}
              <select
                className="text-xs border rounded px-2 py-1"
                value={taskFilter}
                onChange={(e)=> setTaskFilter(e.target.value)}
                title="Filter tasks"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="overdue">Overdue</option>
              </select>
              {/* Assignee selector for new task */}
              <select
                className="text-xs border rounded px-2 py-1"
                value={assignee}
                onChange={(e)=> setAssignee(e.target.value)}
                title="Assignee for new tasks"
              >
                <option value="auto">Auto</option>
                {lead?.owner_id ? <option value="owner">Lead Owner</option> : null}
                {lead?.assignee_id && lead?.assignee_id !== lead?.owner_id ? <option value="assigned">Assigned</option> : null}
                <option value="none">Unassigned</option>
              </select>
              <button className="icon-btn text-xs" onClick={()=> setTaskWizardOpen(true)} disabled={busy}><FiPlus/> Add</button>
            </div>
          }>
            {(!tasks || tasks.length === 0) ? (
              <div className="text-xs text-slate-500">No tasks yet</div>
            ) : (
              <div className="space-y-2">
                {tasks.map((t) => (
                  <div key={t.id} className={`rounded-lg border border-slate-200 p-2 text-sm flex items-center gap-2 ${t.status === 'done' ? "opacity-70 bg-slate-50" : ""}`}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={t.status === 'done'}
                      onChange={async (e) => {
                        setBusy(true);
                        try {
                          const updated = await toggleLeadTaskDone(t.id, e.target.checked);
                          if (taskFilter === 'open' && updated.status === 'done') {
                            setTasks(prev => prev.filter(x => x.id !== t.id));
                          } else {
                            setTasks(prev => prev.map(x => x.id === t.id ? updated : x));
                          }
                        } finally { setBusy(false); }
                      }}
                    />
                    <div
                      className="flex-1 truncate cursor-text"
                      title={t.title}
                      onDoubleClick={async () => {
                        const next = prompt("Edit title:", t.title || "");
                        if (next == null || next === t.title) return;
                        setBusy(true);
                        try {
                          const updated = await updateLeadTask(t.id, { title: next });
                          setTasks(prev => prev.map(x => x.id === t.id ? updated : x));
                        } finally { setBusy(false); }
                      }}
                    >
                      {t.title || "(untitled)"}
                    </div>
                    <input
                      type="datetime-local"
                      className="text-xs border border-slate-200 rounded px-1 py-1"
                      value={t.due_date ? toLocalInputValue(t.due_date) : ""}
                      onChange={async (e) => {
                        setBusy(true);
                        try {
                          const iso = e.target.value ? new Date(e.target.value).toISOString() : null;
                          const updated = await updateLeadTask(t.id, { due_date: iso });
                          // If overdue filter, re-check membership
                          if (taskFilter === 'overdue') {
                            const isOverdue = !!(updated.due_date && updated.status !== 'done' && new Date(updated.due_date) < new Date());
                            if (!isOverdue) {
                              setTasks(prev => prev.filter(x => x.id !== t.id));
                            } else {
                              setTasks(prev => prev.map(x => x.id === t.id ? updated : x));
                            }
                          } else {
                            setTasks(prev => prev.map(x => x.id === t.id ? updated : x));
                          }
                        } finally { setBusy(false); }
                      }}
                    />
                    <button
                      className="icon-btn text-xs"
                      onClick={async () => {
                        if (!confirm("Delete task?")) return;
                        setBusy(true);
                        try {
                          await deleteLeadTask(t.id);
                          setTasks(prev => prev.filter(x => x.id !== t.id));
                        } finally { setBusy(false); }
                      }}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Danger zone */}
          <Section icon={<FiTrash2 />} title="Danger">
            <button
              className="inline-flex items-center gap-2 text-red-600 border border-red-200 px-3 py-1.5 rounded"
              onClick={hardDelete} disabled={busy}
            >
              <FiTrash2/> Delete lead
            </button>
          </Section>
        </div>
      </aside>
      {/* Respond wizard overlay (higher z-index) */}
      <RespondWizard open={respondOpen} lead={lead} onClose={() => setRespondOpen(false)} />
      {/* Task wizard overlay */}
      <TaskWizard
        open={taskWizardOpen}
        lead={lead}
        onClose={()=> setTaskWizardOpen(false)}
        defaultAssignee={assignee}
        onCreated={async (t)=>{
          if (taskFilter === 'overdue') {
            const fresh = await fetchLeadTasks(lead.id, { onlyOpen: taskFilter==='open', overdue: taskFilter==='overdue' });
            setTasks(Array.isArray(fresh) ? fresh : []);
          } else if (taskFilter === 'open' && t.status === 'done') {
            // shouldn't happen on create, but keep consistent
          } else {
            setTasks(prev => [t, ...prev]);
          }
          onChanged?.('task_create');
        }}
      />
    </div>
  );
}
