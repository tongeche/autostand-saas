import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getTenantId } from "../lib/tenant";

const DEFAULTS = { colors: { primary:"#3c6b5b", accent:"#9ad0bb", surface:"#f3f4f6" } };

function applyTheme(settings) {
  const c = settings?.colors || {};
  const r = document.documentElement.style;
  r.setProperty("--color-primary", c.primary || DEFAULTS.colors.primary);
  r.setProperty("--color-accent",  c.accent  || DEFAULTS.colors.accent);
  r.setProperty("--color-surface", c.surface || DEFAULTS.colors.surface);
}

export default function ThemeProvider({ children }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        if (!supabase) throw new Error("no supabase env");
        const { data, error } = await supabase
          .from("themes").select("settings")
          .eq("org_id", getTenantId())
          .order("created_at", { ascending: false })
          .limit(1).maybeSingle();
        if (error) throw error;
        applyTheme(data?.settings);
      } catch {
        applyTheme(DEFAULTS);
      } finally {
        setReady(true);
      }
    })();
  }, []);
  if (!ready) return null;
  return <>{children}</>;
}
