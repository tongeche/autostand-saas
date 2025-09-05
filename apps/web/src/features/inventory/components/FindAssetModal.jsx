import React, { useState } from "react";
import { FiX, FiSearch } from "react-icons/fi";

export default function FindAssetModal({ open, onClose, onFind }){
  const [q, setQ] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] bg-black/30 flex items-start justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="font-medium">View Asset</div>
          <button className="p-2 rounded border" onClick={onClose}><FiX/></button>
        </div>
        <div className="p-4 space-y-3">
          <label className="text-sm block">
            <div className="text-slate-600 mb-1">Matrícula ou termo</div>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" value={q} onChange={(e)=> setQ(e.target.value)} placeholder="AA-00-AA, Golf…"/>
          </label>
          <div className="flex items-center justify-end gap-2">
            <button className="px-3 py-2 border rounded" onClick={onClose}>Cancel</button>
            <button className="px-3 py-2 rounded bg-gray-900 text-white inline-flex items-center gap-2" onClick={()=> onFind?.(q)} disabled={!q.trim()}>
              <FiSearch/> Find
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

