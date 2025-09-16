import React, { useEffect, useState } from "react";
import { FiX, FiSave, FiClock } from "react-icons/fi";
import { supabase } from "../../../lib/supabase";           
import { getTenantId } from "../../../lib/tenant";          
import { createLeadTask } from "../../leads/services/supabase";

export default function QuickTaskModal({ open, leadId, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [dueInput, setDueInput] = useState(""); 
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    // defaults
    setErr("");
    setTitle("");
    const d = new Date();
    d.setHours(d.getHours() + 2); 
    d.setSeconds(0, 0);
    setDueInput(toLocalInput(d));
  }, [open]);

  if (!open) return null;

  async function onSave() {
    if (!title.trim()) {
      setErr("Please enter a task title");
      return;
    }
    try {
      setBusy(true);
      setErr("");

      const dueISO = dueInput ? new Date(dueInput).toISOString() : null;

      // Create the task (your existing flow)
      const task = await createLeadTask(leadId, {
        title: title.trim(),
        due_date: dueISO || null
      });

      // 🔔 fire-and-forget push (same pattern as TaskWizard)
      try {
        const { data: userWrap } = await supabase.auth.getUser();
        const userId = userWrap?.user?.id;
        const orgId = getTenantId();
        if (userId) {
          const mod = await import("../../notifications/services/pushClient").catch(() => ({}));

          // Ensure subscription on first use (uses this click as the gesture)
          if (mod?.ensurePushEnabled && typeof Notification !== "undefined" && Notification.permission !== "granted") {
            await mod.ensurePushEnabled().catch(() => {});
          }

          if (mod?.sendTaskPush) {
            mod.sendTaskPush({
              userId,
              orgId,
              task: { id: task.id, title: task.title }
            });
          } else {
            const { getFunctionsBase } = await import("../../../lib/functionsBase");
            const base = getFunctionsBase();
            fetch(`${base}/push-send`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: userId,
                org_id: orgId || undefined,
                payload: {
                  title: "New Task",
                  body: task.title || "You have a new task",
                  data: { url: `/tasks/${task.id}` }
                }
              })
            }).catch(() => {});
          }
        }
      } catch { /* ignore push errors */ }

      // notify parent + close (original behavior)
      onCreated?.(task);
      onClose?.();
    } catch (e) {
      console.error("QuickTask create failed", e);
      setErr(e?.message || "Failed to create task");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/30 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-medium">Quick Task</div>
          <button
            onClick={onClose}
            className="p-2 rounded border hover:bg-gray-50"
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {err ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {err}
            </div>
          ) : null}

          {/* Title */}
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Title</div>
            <input
              className="w-full rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/60"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Call customer"
            />
          </label>

          {/* Due */}
          <label className="text-sm block">
            <div className="text-slate-600 mb-1 inline-flex items-center gap-2">
              <FiClock className="text-slate-500" /> Due date
            </div>
            <input
              type="datetime-local"
              className="w-full rounded-lg px-3 py-2 text-sm border border-slate-200"
              value={dueInput}
              onChange={(e) => setDueInput(e.target.value)}
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="px-3 py-2 border rounded"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded bg-gray-900 text-white inline-flex items-center gap-2"
              onClick={onSave}
              disabled={busy || !title.trim()}
            >
              <FiSave /> Save Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function toLocalInput(d) {
  try {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}
