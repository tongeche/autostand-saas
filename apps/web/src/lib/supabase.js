import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Guard: never crash render if envs are missing
export const supabase = (url && key) ? createClient(url, key) : null;
