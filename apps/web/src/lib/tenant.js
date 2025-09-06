export function getTenantId() {
  try {
    if (typeof window !== 'undefined'){
      const fromStore = window.localStorage.getItem('org_id');
      if (fromStore) return fromStore;
    }
  } catch {}
  return import.meta.env.VITE_DEV_TENANT_ID;
}
