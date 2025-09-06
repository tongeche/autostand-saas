import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Guard: never crash render if envs are missing
if (!url || !key) {
  // Helpful log for Netlify/env misconfigurations
  // eslint-disable-next-line no-console
  console.warn("[Supabase] Missing envs: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY");
}
export const supabase = (url && key) ? createClient(url, key) : null;
