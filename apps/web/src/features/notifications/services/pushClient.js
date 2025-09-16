import { getFunctionsBase } from '../../../lib/functionsBase';

export async function sendTaskPush({ userId, orgId, task }) {
  try {
    const base = getFunctionsBase();
    await fetch(`${base}/push-send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        org_id: orgId,
        payload: {
          title: "New Task",
          body: task.title || "You have a new task",
          data: { url: `/tasks/${task.id}` }
        }
      })
    });
  } catch (e) {
    console.warn("Push send failed", e);
  }
}
