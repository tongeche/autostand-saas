// POST /.netlify/functions/inbound-postmark
// Accepts Postmark Inbound (JSON) and upserts a lead without Zoho Deluge.
// Configure Postmark Inbound to deliver to this endpoint, and in Zoho Mail
// set a Filter to forward matching emails to your Postmark Inbound address.
//
// Env required:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - INBOUND_DEFAULT_ORG_ID
// - INBOUND_DEFAULT_TENANT_ID
// - (optional) POSTMARK_INBOUND_SECRET  // verify X-Postmark-Signature

type Json = Record<string, unknown>;

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(), body: '' };
  if (event.httpMethod !== 'POST')    return json(405, { error: 'Method Not Allowed' });

  try{
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INBOUND_DEFAULT_ORG_ID, INBOUND_DEFAULT_TENANT_ID, POSTMARK_INBOUND_SECRET } = process.env as Record<string,string|undefined>;
    requireEnv('SUPABASE_URL', SUPABASE_URL);
    requireEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY);
    requireEnv('INBOUND_DEFAULT_ORG_ID', INBOUND_DEFAULT_ORG_ID);
    requireEnv('INBOUND_DEFAULT_TENANT_ID', INBOUND_DEFAULT_TENANT_ID);

    const raw = event.body || '';
    const parsed = parseJson<any>(raw);

    // Auth: prefer Postmark signature; otherwise support Basic or query token if configured
    const authOk = await verifyAuth(event, raw);
    if (!authOk) return json(401, { error: 'Unauthorized' });

    // Map basic fields
    const from = parsed?.FromFull?.Email || parsed?.From || '';
    const subject = parsed?.Subject || '';
    const message_id = parsed?.MessageID || (Array.isArray(parsed?.Headers) ? (parsed.Headers.find((h:any)=> h?.Name === 'Message-ID')?.Value || '') : '');
    const date = parsed?.Date || new Date().toISOString();
    const bodyText = String(parsed?.TextBody || '') || stripHtml(String(parsed?.HtmlBody || ''));

    // Extract customer email from body; fallback to From
    const email = extractEmailFromBody(bodyText) || from;
    if (!email) return json(400, { error: 'No email found' });

    const name = extractNameFromEmail(email);
    const org_id = INBOUND_DEFAULT_ORG_ID as string;
    const tenant_id = INBOUND_DEFAULT_TENANT_ID as string;

    const meta = { subject, from, to: parsed?.To || '', date, message_id };

    // Upsert lead via Supabase REST
    const existing = await getLeadByEmail(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string, org_id, email);
    let lead_id: string;
    if (existing?.id) {
      const upd = await updateLead(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string, existing.id, { name, source: 'postmark-inbound', meta });
      lead_id = upd.id;
    } else {
      const ins = await createLead(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string, { org_id, tenant_id, email, name, source: 'postmark-inbound', meta });
      lead_id = ins.id;
    }

    // Insert note with full body
    await insertLeadNote(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string, { org_id, tenant_id, lead_id, body: bodyText });

    return json(200, { ok: true, lead_id });
  }catch(e:any){
    console.error('[inbound-postmark] error', e);
    return json(500, { error: String(e?.message || e) });
  }
};

// ---------- helpers ----------

function corsHeaders(){
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, authorization',
    'Content-Type': 'application/json',
  };
}
function json(code:number, body:Json){
  return { statusCode: code, headers: corsHeaders(), body: JSON.stringify(body) };
}
function requireEnv(name:string, val:unknown){ if (!val) throw new Error(`[inbound-postmark] Missing env: ${name}`); }
function parseJson<T=any>(raw:string){ try{ return JSON.parse(raw) as T; } catch{ throw new Error('Invalid JSON'); } }

function stripHtml(html:string){ return html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); }
function extractEmailFromBody(body:string){ const m = body.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/); return m ? m[0] : null; }
function extractNameFromEmail(email:string){ const local = (email||'').split('@')[0]; return local.replace(/[._-]+/g,' ').split(' ').map(w=> w? (w[0].toUpperCase()+w.slice(1).toLowerCase()) : '').join(' ').trim(); }

function supaHeaders(key:string, extra?:Record<string,string>){
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(extra||{}),
  };
}

async function getLeadByEmail(base:string, key:string, org_id:string, email:string){
  const url = `${base}/rest/v1/leads?select=id&org_id=eq.${encodeURIComponent(org_id)}&email=eq.${encodeURIComponent(email)}&limit=1`;
  const r = await fetch(url, { headers: supaHeaders(key) });
  if (!r.ok) throw new Error(`getLead ${r.status} ${await r.text()}`);
  const rows = await r.json() as Array<{id:string}>;
  return rows[0] || null;
}
async function updateLead(base:string, key:string, id:string, patch:Record<string,any>){
  const r = await fetch(`${base}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: supaHeaders(key, { Prefer: 'return=representation' }), body: JSON.stringify(patch)
  });
  if (!r.ok) throw new Error(`updateLead ${r.status} ${await r.text()}`);
  const rows = await r.json() as Array<{id:string}>; return rows[0];
}
async function createLead(base:string, key:string, row:Record<string,any>){
  const r = await fetch(`${base}/rest/v1/leads`, {
    method: 'POST', headers: supaHeaders(key, { Prefer: 'return=representation' }), body: JSON.stringify(row)
  });
  if (!r.ok) throw new Error(`createLead ${r.status} ${await r.text()}`);
  const rows = await r.json() as Array<{id:string}>; return rows[0];
}
async function insertLeadNote(base:string, key:string, row:Record<string,any>){
  const r = await fetch(`${base}/rest/v1/lead_notes`, {
    method: 'POST', headers: supaHeaders(key, { Prefer: 'return=minimal' }), body: JSON.stringify(row)
  });
  if (!r.ok) throw new Error(`insertLeadNote ${r.status} ${await r.text()}`);
}

// Postmark inbound signature verification
import crypto from 'crypto';
function verifyPostmark(token:string, raw:string, signatureHeader:string){
  try{
    const hmac = crypto.createHmac('sha256', token).update(raw, 'utf8').digest('base64');
    // Signature can contain multiple, accept if any matches
    return signatureHeader.split(',').some((sig)=> sig.trim() === hmac);
  }catch{ return false; }
}

// Flexible auth: Postmark signature OR Basic auth OR query token
async function verifyAuth(event:any, raw:string){
  const headers = (event.headers || {}) as Record<string, unknown>;
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    lower[String(k).toLowerCase()] = String(v ?? '');
  }
  const { POSTMARK_INBOUND_SECRET, INBOUND_BASIC_USER, INBOUND_BASIC_PASS, INBOUND_QUERY_TOKEN } = process.env as Record<string, string|undefined>;

  // 1) If Postmark signing is configured, require it
  if (POSTMARK_INBOUND_SECRET) {
    const sig: string = lower['x-postmark-signature'];
    if (!sig) return false;
    return verifyPostmark(POSTMARK_INBOUND_SECRET as string, raw, sig);
  }

  // 2) Otherwise, if Basic credentials are configured, require them
  if (INBOUND_BASIC_USER || INBOUND_BASIC_PASS) {
    const auth = lower['authorization'] || '';
    if (!auth.toLowerCase().startsWith('basic ')) return false;
    const b64: string = auth.slice(6).trim();
    let decoded = '';
    try{ decoded = Buffer.from(b64, 'base64').toString('utf8'); }catch{ return false; }
    const idx = decoded.indexOf(':');
    const user = idx >= 0 ? decoded.slice(0, idx) : decoded;
    const pass = idx >= 0 ? decoded.slice(idx + 1) : '';
    if (user !== (INBOUND_BASIC_USER||'') || pass !== (INBOUND_BASIC_PASS||'')) return false;
    return true;
  }

  // 3) Otherwise, if a query token is configured, require it
  if (INBOUND_QUERY_TOKEN) {
    const qs = (event.queryStringParameters || {}) as Record<string, string>;
    if ((qs.token || '') !== INBOUND_QUERY_TOKEN) return false;
    return true;
  }

  // 4) No auth configured — allow (use ONLY for testing)
  return true;
}
