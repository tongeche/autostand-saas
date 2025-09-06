export function getTenantId() {
  try {
    if (typeof window !== 'undefined'){
      const fromStore = window.localStorage.getItem('org_id');
      if (fromStore) return fromStore;
    }
  } catch {}
  // Do NOT fallback to a test tenant in production
  if (import.meta && import.meta.env && import.meta.env.DEV) {
    // Support both legacy and new env var names during migration
    return import.meta.env.VITE_DEV_ORG_ID || import.meta.env.VITE_DEV_TENANT_ID || null;
  }
  return null;
}
