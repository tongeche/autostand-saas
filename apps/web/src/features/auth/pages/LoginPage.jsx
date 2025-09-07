import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "../../../lib/supabase";

export default function LoginPage(){
  const nav = useNavigate();
  const loc = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(()=>{ setMsg(""); setErrors({ email: "", password: "" }); }, [email, password]);

  const formValid = useMemo(() => {
    // keep it simple; rely on server for auth validation
    return Boolean(email && password);
  }, [email, password]);

  async function login(e){
    e?.preventDefault();
    setSubmitted(true);
    if (!formValid) {
      setMsg("Enter your email and password.");
      return;
    }
    try{
      setBusy(true); setMsg("");
      if (!supabase) {
        throw new Error("Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment.");
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Flag both fields as invalid for wrong creds
        const inline = /invalid|wrong|cred/i.test(error.message) ? "Invalid email or password." : error.message;
        setErrors({ email: inline, password: inline });
        throw error;
      }
      const params = new URLSearchParams(loc.search);
      const redirect = params.get("redirect") || "/dashboard";
      nav(redirect, { replace: true });
    } catch(e){
      setMsg(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword(){
    try{
      setMsg("");
      if (!email) {
        setErrors(prev => ({ ...prev, email: "Enter your email to receive a reset link." }));
        return;
      }
      if (!supabase) {
        throw new Error("Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment.");
      }
      // Optional: change redirectTo to your password-update route
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      setMsg("Password reset link sent. Check your email.");
    } catch(e){
      setMsg(e.message || String(e));
    }
  }

  const emailHasErr = !!errors.email && submitted;
  const pwHasErr = !!errors.password && submitted;

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <form onSubmit={login} className="w-full max-w-sm bg-white rounded-2xl shadow p-4 space-y-3" noValidate>
        <div className="text-lg font-semibold">Sign in</div>

        {msg && (
          <div className={`text-sm ${/reset link sent/i.test(msg) ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-red-700 bg-red-50 border-red-200"} border rounded p-2`}>
            {msg}
          </div>
        )}

        <label className="text-sm block">
          <div className="text-slate-600 mb-1">Email</div>
          <input
            className={`w-full rounded-lg border px-3 py-2 text-sm ${emailHasErr ? "border-red-400" : ""}`}
            type="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            aria-invalid={emailHasErr}
          />
          {emailHasErr && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </label>

        <label className="text-sm block">
          <div className="text-slate-600 mb-1 flex items-center justify-between">
            <span>Password</span>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-[11px] text-blue-700 hover:underline"
              disabled={busy}
            >
              Forgot password?
            </button>
          </div>
          <input
            className={`w-full rounded-lg border px-3 py-2 text-sm ${pwHasErr ? "border-red-400" : ""}`}
            type="password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            aria-invalid={pwHasErr}
          />
          {pwHasErr && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
        </label>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Link to="/signup" className="text-sm text-slate-600 hover:underline">Create account</Link>
          <button
            type="submit"
            className={`px-3 py-2 rounded-lg text-white text-sm ${formValid && !busy ? "bg-gray-900 hover:bg-gray-800" : "bg-gray-400 cursor-not-allowed"}`}
            disabled={busy || !formValid}
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
