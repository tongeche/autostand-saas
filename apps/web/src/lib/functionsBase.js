// Helper for choosing the best Netlify Functions base in dev/prod.
// Supports multiple candidates via VITE_FUNCTIONS_BASES (comma-separated).

const DEFAULT_BASE = '/.netlify/functions';
const ENV_BASE = import.meta.env.VITE_FUNCTIONS_BASE;
const ENV_BASES = import.meta.env.VITE_FUNCTIONS_BASES;

function uniq(arr){ return Array.from(new Set(arr.filter(Boolean))); }

export function getCandidateBases(){
  const list = [];
  if (ENV_BASES){ list.push(...String(ENV_BASES).split(/[,\s]+/).filter(Boolean)); }
  if (ENV_BASE) list.push(String(ENV_BASE));
  list.push(DEFAULT_BASE);
  return uniq(list);
}

export function getFunctionsBase(){
  try{
    const cached = window.localStorage.getItem('functions_base_selected');
    if (cached) return cached;
  }catch{}
  const [first] = getCandidateBases();
  return first || DEFAULT_BASE;
}

export async function detectFunctionsBase({ timeoutMs=1500 } = {}){
  const bases = getCandidateBases();
  for (const base of bases){
    try{
      const ctrl = new AbortController();
      const t = setTimeout(()=> ctrl.abort(), timeoutMs);
      const res = await fetch(`${base}/push-send`, { method:'OPTIONS', signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok || res.status === 204){
        try{ window.localStorage.setItem('functions_base_selected', base); }catch{}
        return base;
      }
    }catch{}
  }
  // nothing reachable, keep default
  try{ window.localStorage.setItem('functions_base_selected', getFunctionsBase()); }catch{}
  return getFunctionsBase();
}

