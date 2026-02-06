import type { ChatMessageResponse, Task } from "@new/shared";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export type DeviceSession = {
  installationId: string;
  accessToken: string;
  timezone: string;
};

type ChatRequest = {
  text?: string;
  selectedChoice?: string;
  defaultDueTime?: string;
};

function endpoint(path: string): string {
  return `${API_BASE}${path}`;
}

function authHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

export async function registerInstallation(timezone: string): Promise<DeviceSession> {
  const res = await fetch(endpoint("/v1/installations/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timezone })
  });
  if (!res.ok) throw new Error("failed to register installation");
  return res.json();
}

export async function sendChatMessage(
  session: DeviceSession,
  payload: ChatRequest
): Promise<ChatMessageResponse> {
  const res = await fetch(endpoint("/v1/chat/messages"), {
    method: "POST",
    headers: authHeaders(session.accessToken),
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("failed to send message");
  return res.json();
}

export async function fetchTasks(session: DeviceSession): Promise<Task[]> {
  const res = await fetch(endpoint("/v1/tasks"), {
    headers: authHeaders(session.accessToken)
  });
  if (!res.ok) throw new Error("failed to fetch tasks");
  const data = await res.json();
  return data.items;
}

export async function subscribePush(session: DeviceSession, subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON();
  const res = await fetch(endpoint("/v1/push/subscribe"), {
    method: "POST",
    headers: authHeaders(session.accessToken),
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth
      }
    })
  });
  if (!res.ok) throw new Error("failed to subscribe push");
}

export async function reclassifyTask(
  session: DeviceSession,
  taskId: string,
  kind: "task" | "memo"
): Promise<void> {
  const res = await fetch(endpoint(`/v1/tasks/${taskId}/reclassify`), {
    method: "POST",
    headers: authHeaders(session.accessToken),
    body: JSON.stringify({ kind })
  });
  if (!res.ok) throw new Error("failed to reclassify");
}
