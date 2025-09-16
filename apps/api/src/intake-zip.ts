// GET /.netlify/functions/intake-zip?id=<uuid>
// Streams a ZIP containing the intake PDF (if any), images from the `car-intake` bucket, and answers.json

import JSZip from 'jszip';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env as Record<string,string|undefined>;

export const handler = async (event: any) => {
  const headers = cors(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try{
    // Support POST with payload to avoid DB dependency
    let intake: any = null;
    if (event.httpMethod === 'POST'){
      const body = safeJson(event.body);
      intake = body && typeof body === 'object' ? body : null;
      if (!intake) return json(400, { error: 'Invalid JSON body' }, headers);
    } else {
      // GET requires env and DB fetch
      requireEnv('SUPABASE_URL', SUPABASE_URL);
      requireEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY);
      const id = (event.queryStringParameters && event.queryStringParameters.id) || '';
      if (!id) return json(400, { error: 'id is required' }, headers);
      intake = await fetchIntake(id);
      if (!intake) return json(404, { error: 'not found' }, headers);
    }

    const zip = new JSZip();
    const folder = zip.folder(`intake-${id}`)!;

    // answers.json
    folder.file('answers.json', JSON.stringify(intake.answers || {}, null, 2));

    // PDF (if present)
    if (intake.pdf_url){
      try{
        const pdfBuf = await fetchAsBuffer(intake.pdf_url);
        if (pdfBuf) folder.file('form.pdf', pdfBuf);
      }catch{}
    }

    // images from car-intake bucket
    const imgs = Array.isArray(intake.images) ? intake.images : [];
    let idx = 0;
    for (const entry of imgs){
      try{
        // Prefer direct URL if provided
        const direct = resolveImageUrl(entry);
        let buf: Buffer | null = null;
        if (direct){
          buf = await fetchAsBuffer(direct);
        } else {
          const key = resolveImageKey(entry);
          if (!key) continue;
          const signed = await createSignedUrl('car-intake', key, 300);
          buf = await fetchAsBuffer(signed || key);
        }
        if (buf){
          const name = (resolveImageKey(entry) || '').split('/').pop() || `img_${idx}.jpg`;
          folder.file(`images/${String(idx).padStart(2,'0')}_${name}`, buf);
          idx++;
        }
      }catch{}
    }

    const nodebuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="intake-${id}.zip"`
      },
      body: nodebuf.toString('base64'),
      isBase64Encoded: true,
    };
  }catch(e: any){
    console.error('[intake-zip] error', e);
    return json(500, { error: e?.message || String(e) }, headers);
  }
};

async function fetchIntake(id: string){
  const url = `${SUPABASE_URL}/rest/v1/car_intake_requests?id=eq.${encodeURIComponent(id)}&select=id,status,answers,images,pdf_url`;
  const r = await fetch(url, { headers: supaHeaders() });
  if (!r.ok) throw new Error(`fetchIntake ${r.status}: ${await r.text()}`);
  const rows = await r.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

function supaHeaders(extra?: Record<string,string>){
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY as string,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    Accept: 'application/json',
    ...(extra||{}),
  };
}

function requireEnv(name: string, val: unknown){
  if (!val) throw new Error(`[intake-zip] Missing env var: ${name}`);
}

function cors(event: any){
  const origin = event?.headers?.origin || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, authorization',
  };
}

function json(code: number, body: any, headers: Record<string,string>){
  return { statusCode: code, headers, body: JSON.stringify(body) };
}

async function createSignedUrl(bucket: string, key: string, expiresIn: number){
  // storage API: POST /storage/v1/object/sign/{bucket}/{object}
  const path = `${SUPABASE_URL}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`;
  const r = await fetch(path, {
    method: 'POST',
    headers: { ...supaHeaders({ 'Content-Type': 'application/json' }) },
    body: JSON.stringify({ expiresIn })
  });
  if (!r.ok) return null;
  const data = await r.json();
  // returns { signedURL: "/object/sign/..." } or similar; build absolute URL
  const part = data?.signedURL || data?.signedUrl || '';
  if (!part) return null;
  return part.startsWith('http') ? part : `${SUPABASE_URL}${part}`;
}

function resolveImageKey(entry: any){
  try{
    if (typeof entry === 'string') return sanitizeKey(entry);
    if (entry && typeof entry === 'object'){
      const p = entry.path || entry.key || entry.name || entry.url || entry.file || '';
      return sanitizeKey(p);
    }
    return '';
  }catch{ return ''; }
}

function resolveImageUrl(entry: any){
  try{
    if (entry && typeof entry === 'object' && entry.url && /^https?:\/\//i.test(entry.url)) return entry.url;
    if (typeof entry === 'string' && /^https?:\/\//i.test(entry)) return entry;
    // If we only have a path, construct public URL (works if bucket is public)
    const key = resolveImageKey(entry);
    if (!key) return '';
    return `${SUPABASE_URL}/storage/v1/object/public/car-intake/${encodeURIComponent(key)}`;
  }catch{ return ''; }
}

function sanitizeKey(p: string){
  let s = String(p||'').trim();
  if (!s) return '';
  // If it looks like a URL, try to extract key after bucket name
  const m = s.match(/storage\/v1\/object\/public\/([^/]+)\/(.+)$/) || s.match(/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/);
  if (m && m[1] && m[2]){
    // ensure bucket is car-intake
    return m[2];
  }
  // remove leading slashes and bucket prefixes
  return s.replace(/^https?:\/\/[^\s]+\//,'').replace(/^\/+/, '').replace(/^car[_ -]intake\//i, '');
}

async function fetchAsBuffer(url: string){
  try{
    const r = await fetch(url);
    if (!r.ok) return null;
    const ab = await r.arrayBuffer();
    return Buffer.from(ab);
  }catch{ return null; }
}

function safeJson(raw: any){
  try{ if (!raw) return null; return JSON.parse(String(raw)); } catch { return null; }
}
