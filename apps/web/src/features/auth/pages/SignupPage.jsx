import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "../../../lib/supabase";

// — helpers —
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function validateEmail(email) {
  if (!email) return "Email is required.";
  if (!EMAIL_RE.test(email)) return "Enter a valid email address.";
  return "";
}

function validatePassword(pw) {
  if (!pw) return "Password is required.";
  // keep it minimal but sane
  if (pw.length < 8) return "Password must be at least 8 characters.";
  return "";
}

export default function SignupPage(){
  const nav = useNavigate();
  const loc = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitted, setSubmitted] = useState(false);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const emailErr = validateEmail(email.trim());
  const pwErr = validatePassword(password);

  // Only show inline errors if field was touched OR the form was submitted
  const showEmailErr = (touched.email || submitted) && !!emailErr;
  const showPwErr = (touched.password || submitted) && !!pwErr;

  const formValid = useMemo(() => !emailErr && !pwErr, [emailErr, pwErr]);

  useEffect(()=>{ setMsg(""); }, [email, password]);

  async function signup(e){
    e?.preventDefault();
    setSubmitted(true);
    if (!formValid) {
      setMsg("Fix the errors and try again.");
      return;
    }
    try{
      setBusy(true); setMsg("");
      if (!supabase) {
        throw new Error("Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment.");
      }
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) throw error;

      setMsg("Check your email to confirm your account.");
      const params = new URLSearchParams(loc.search);
      const redirect = params.get("redirect") || "/login";
      setTimeout(()=> nav(redirect, { replace: true }), 1200);
    } catch(e){
      setMsg(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <form onSubmit={signup} className="w-full max-w-sm bg-white rounded-2xl shadow p-4 space-y-3" noValidate>
        <div className="text-lg font-semibold">Create account</div>

        {msg && (
          <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded p-2">
            {msg}
          </div>
        )}

        <label className="text-sm block">
          <div className="text-slate-600 mb-1">Email</div>
          <input
            className={`w-full rounded-lg border px-3 py-2 text-sm ${showEmailErr ? "border-red-400" : ""}`}
            type="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            onBlur={()=> setTouched(t=>({ ...t, email: true }))}
            placeholder="maria@example.com"
            required
            autoComplete="email"
            aria-invalid={showEmailErr}
          />
          {showEmailErr && <p className="mt-1 text-xs text-red-600">{emailErr}</p>}
        </label>

        <label className="text-sm block">
          <div className="text-slate-600 mb-1">Password</div>
          <input
            className={`w-full rounded-lg border px-3 py-2 text-sm ${showPwErr ? "border-red-400" : ""}`}
            type="password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            onBlur={()=> setTouched(t=>({ ...t, password: true }))}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            aria-invalid={showPwErr}
          />
          {/* No visible rules; only show if invalid */}
          {showPwErr && <p className="mt-1 text-xs text-red-600">{pwErr}</p>}
        </label>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Link to="/login" className="text-sm text-slate-600 hover:underline">Have an account? Sign in</Link>
          <button
            type="submit"
            className={`px-3 py-2 rounded-lg text-white text-sm ${formValid && !busy ? "bg-gray-900 hover:bg-gray-800" : "bg-gray-400 cursor-not-allowed"}`}
            disabled={busy || !formValid}
          >
            {busy ? "Signing up..." : "Sign up"}
          </button>
        </div>
      </form>
    </div>
  );
}
