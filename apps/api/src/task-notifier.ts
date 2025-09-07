// Scheduled dispatcher for “task due soon” pushes.
// Requires DB view: public.v_task_push_targets (V2 version using due_at + assignee_id).
// Add schedule in netlify.toml:
// [functions."task-notifier"]
//   schedule = "* * * * *"

type TargetRow = {
  task_id: string;
  task_title: string;
  task_done: boolean;
  due_time: string | null;
  org_id: string | null;
  target_user_id: string | null;
};

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL } = process.env;

export const handler = async () => {
  try {
    const now = new Date();
    const soonIso = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    const nowIso  = now.toISOString();

    // 1) Due soon tasks (open, have user, due within next 15 min)
    const dueSoon = await sql<TargetRow>(`
      select task_id, task_title, task_done, due_time, org_id, target_user_id
      from public.v_task_push_targets
      where task_done = false
        and target_user_id is not null
        and due_time is not null
        and due_time <= '${soonIso}'
        and due_time >  '${nowIso}'
      order by due_time asc
      limit 200
    `);

    let processed = 0;

    for (const t of dueSoon) {
      // 2) De-dup using your notifications table (one per task/user/kind)
      const exists = await sql<{ exists: boolean }>(`
        select exists(
          select 1 from public.notifications n
          where n.kind = 'task_due_reminder'
            and (n.ref->>'task_id') = '${t.task_id}'
            and coalesce(n.user_id, '00000000-0000-0000-0000-000000000000') = '${t.target_user_id}'
        ) as exists
      `);
      if (exists[0]?.exists) continue;

      // 3) Record a notification row for UI parity
      await rest("/rest/v1/notifications", "POST", {
        org_id: t.org_id,
        user_id: t.target_user_id,
        kind: "task_due_reminder",
        title: "Task due soon",
        body: t.task_title ?? "",
        ref: { task_id: t.task_id },
        deliver_at: t.due_time,
      });

      // 4) Push now
      await fetch(`${process.env.URL}/.netlify/functions/push-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: t.target_user_id,
          org_id: t.org_id,
          payload: {
            title: "Task due soon",
            body: t.task_title ?? "",
            data: { url: `${SITE_URL}/tasks/${t.task_id}` }
          }
        })
      });

      processed++;
    }

    return json(200, { processed });
  } catch (e: any) {
    console.error("[task-notifier] error", e);
    return json(500, { error: String(e?.message || e) });
  }
};

// -------- tiny Supabase helpers --------
async function rest(path: string, method: string, body?: any) {
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY as string,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json().catch(() => ({}));
}
async function sql<T = any>(query: string): Promise<T[]> {
  return rest("/rest/v1/rpc/raw_sql", "POST", { sql: query }) as Promise<T[]>;
}
function json(code: number, data: any) {
  return { statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) };
}
