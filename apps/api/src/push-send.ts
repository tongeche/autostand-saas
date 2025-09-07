// POST /.netlify/functions/push-send
// Body:
// {
//   "user_id": "uuid" | ["uuid1","uuid2"],
//   "org_id": "uuid",        // optional; if you scoped device subs by org
//   "payload": {
//     "title": "Task due soon",
//     "body": "Prepare report",
//     "data": { "url": "/tasks/123" },
//     "actions": [{ "action": "open", "title": "Open task" }],
//     "requireInteraction": false
//   }
// }

import webpush from "web-push";

const {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

// Fail fast if misconfigured
requireEnv("VAPID_PUBLIC_KEY", VAPID_PUBLIC_KEY);
requireEnv("VAPID_PRIVATE_KEY", VAPID_PRIVATE_KEY);
requireEnv("SUPABASE_URL", SUPABASE_URL);
requireEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);

webpush.setVapidDetails(
  "mailto:ops@yourdomain",
  VAPID_PUBLIC_KEY as string,
  VAPID_PRIVATE_KEY as string
);

type Json = Record<string, unknown>;
interface PushAction { action: string; title: string; icon?: string }
interface PushPayload {
  title?: string; body?: string; data?: Json; actions?: PushAction[]; requireInteraction?: boolean;
}
interface ReqBody {
  user_id: string | string[];
  org_id?: string;
  payload: PushPayload;
}

export const handler = async (event: any) => {
  const headers = cors(event);

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST")    return json(405, { error: "Method Not Allowed" }, headers);

  try {
    const body = parseJson<ReqBody>(event.body);
    if (!body?.user_id) return json(400, { error: "user_id is required" }, headers);
    if (!body?.payload) return json(400, { error: "payload is required" }, headers);

    const userIds = Array.isArray(body.user_id) ? body.user_id : [body.user_id];
    const payload = normalizePayload(body.payload);

    const subs = await fetchSubscriptions(userIds, body.org_id);
    if (!subs.length) return json(200, { sent: 0, devices: 0, cleaned: 0 }, headers);

    const payloadStr = JSON.stringify(payload);

    const results = await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh,auth: s.auth, } },
          payloadStr
        )
      )
    );

    // Clean dead endpoints (404/410/etc.)
    const toClean = subs
      .map((s, i) => ({ s, r: results[i] }))
      .filter(({ r }) => r.status === "rejected" && isGone((r as PromiseRejectedResult).reason))
      .map(({ s }) => s.endpoint);

    let cleaned = 0;
    if (toClean.length) cleaned = await deleteByEndpoints(toClean);

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return json(200, { sent, failed: results.length - sent, cleaned, devices: subs.length }, headers);
  } catch (e: any) {
    console.error("[push-send] error:", e);
    return json(500, { error: String(e?.message || e) }, headers);
  }
};

// ---------------- helpers ----------------

function requireEnv(name: string, val: unknown) {
  if (!val) throw new Error(`[push-send] Missing env var: ${name}`);
}
function cors(event: any) {
  const origin = event?.headers?.origin || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Content-Type": "application/json",
  };
}
function json(code: number, body: Json, headers: Record<string, string>) {
  return { statusCode: code, headers, body: JSON.stringify(body) };
}
function parseJson<T = any>(raw: string | null | undefined): T {
  if (!raw) return {} as T;
  try { return JSON.parse(raw) as T; } catch { throw new Error("Invalid JSON body"); }
}
function normalizePayload(p: PushPayload): Required<PushPayload> {
  return {
    title: p.title ?? "Notification",
    body: p.body ?? "",
    data: p.data ?? {},
    actions: p.actions ?? [],
    requireInteraction: !!p.requireInteraction,
  };
}

function supaHeaders(extra?: Record<string,string>) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY as string,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(extra || {}),
  };
}

async function fetchSubscriptions(userIds: string[], orgId?: string) {
  const inList = userIds.map(encodeURIComponent).join(",");
  let url = `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=in.(${inList})`;
  if (orgId) url += `&org_id=eq.${encodeURIComponent(orgId)}`;
  const r = await fetch(url, { headers: supaHeaders() });
  if (!r.ok) throw new Error(`Supabase get subs ${r.status}: ${await r.text()}`);
  return r.json() as Promise<Array<{ endpoint: string; p256dh: string; auth: string }>>;
}

async function deleteByEndpoints(endpoints: string[]) {
  const encoded = endpoints.map(encodeURIComponent).join(",");
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=in.(${encoded})`,
    { method: "DELETE", headers: supaHeaders({ Prefer: "return=minimal" }) }
  );
  if (!r.ok) {
    console.warn("[push-send] cleanup failed:", r.status, await r.text());
    return 0;
  }
  return endpoints.length;
}

function isGone(reason: unknown) {
  const s = String(reason || "");
  return /410|404|not\s*found|expired|invalid\s*endpoint|no\s*subscription/i.test(s);
}
