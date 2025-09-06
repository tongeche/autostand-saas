import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export function useSupabaseSession(){
  const [session, setSession] = useState(null);
  useEffect(()=>{
    let sub;
    (async ()=>{
      try{ const { data } = await supabase?.auth.getSession(); setSession(data?.session || null); }catch{}
      sub = supabase?.auth.onAuthStateChange((_e, s)=> setSession(s)) || null;
    })();
    return ()=> sub?.data?.subscription?.unsubscribe?.();
  }, []);
  return session;
}

