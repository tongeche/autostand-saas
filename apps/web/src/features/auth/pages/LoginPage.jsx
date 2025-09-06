import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "../../../lib/supabase";

export default function LoginPage(){
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(()=>{ setMsg(""); }, [email,password]);

  async function login(e){
    e?.preventDefault();
    try{
      setBusy(true); setMsg("");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const params = new URLSearchParams(loc.search);
      const redirect = params.get("redirect") || "/dashboard";
      nav(redirect, { replace: true });
    } catch(e){ setMsg(e.message || String(e)); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <form onSubmit={login} className="w-full max-w-sm bg-white rounded-2xl shadow p-4 space-y-3">
        <div className="text-lg font-semibold">Sign in</div>
        {msg && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{msg}</div>}
        <label className="text-sm block">
          <div className="text-slate-600 mb-1">Email</div>
          <input className="w-full rounded-lg border px-3 py-2 text-sm" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" required />
        </label>
        <label className="text-sm block">
          <div className="text-slate-600 mb-1">Password</div>
          <input className="w-full rounded-lg border px-3 py-2 text-sm" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" required />
        </label>
        <div className="flex items-center justify-between gap-2 pt-1">
          <Link to="/signup" className="text-sm text-slate-600 hover:underline">Create account</Link>
          <button type="submit" className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm" disabled={busy}>Sign in</button>
        </div>
      </form>
    </div>
  );
}
