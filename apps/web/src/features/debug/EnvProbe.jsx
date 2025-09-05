import { supabase } from "../../lib/supabase";
import { getTenantId } from "../../lib/tenant";

export default function EnvProbe() {
  const url = import.meta.env?.VITE_SUPABASE_URL;
  const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;
  const tenant = getTenantId();
  return (
    <div className="card p-3 text-xs">
      <div><b>VITE_SUPABASE_URL:</b> {url || "(missing)"}</div>
      <div><b>VITE_SUPABASE_ANON_KEY:</b> {key ? key.slice(0, 8) + "…" : "(missing)"} </div>
      <div><b>Tenant:</b> {tenant || "(missing)"} </div>
      <div><b>Supabase client:</b> {supabase ? "ok" : "not initialised"}</div>
    </div>
  );
}
