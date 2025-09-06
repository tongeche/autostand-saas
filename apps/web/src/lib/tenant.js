export function getTenantId() {
  try {
    if (typeof window !== 'undefined'){
      const fromStore = window.localStorage.getItem('org_id');
      if (fromStore) return fromStore;
    }
  } catch {}
  // Do NOT fallback to a test tenant in production
  if (import.meta && import.meta.env && import.meta.env.DEV) {
    return import.meta.env.VITE_DEV_TENANT_ID || null;
  }
  return null;
}
