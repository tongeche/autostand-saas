export function ucFirst(s){
  const str = String(s||'');
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatShortDate(d){
  try{
    const dt = (d instanceof Date) ? d : new Date(d);
    return dt.toLocaleString('en-US', { month: 'short', day: 'numeric' }); // e.g., Jan 23
  }catch{
    return '—';
  }
}
