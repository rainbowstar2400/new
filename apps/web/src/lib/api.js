const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
function endpoint(path) {
    return `${API_BASE}${path}`;
}
function authHeaders(token) {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    };
}
export async function registerInstallation(timezone) {
    const res = await fetch(endpoint("/v1/installations/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone })
    });
    if (!res.ok)
        throw new Error("failed to register installation");
    return res.json();
}
export async function sendChatMessage(session, payload) {
    const res = await fetch(endpoint("/v1/chat/messages"), {
        method: "POST",
        headers: authHeaders(session.accessToken),
        body: JSON.stringify(payload)
    });
    if (!res.ok)
        throw new Error("failed to send message");
    return res.json();
}
export async function fetchTasks(session) {
    const res = await fetch(endpoint("/v1/tasks"), {
        headers: authHeaders(session.accessToken)
    });
    if (!res.ok)
        throw new Error("failed to fetch tasks");
    const data = await res.json();
    return data.items;
}
export async function subscribePush(session, subscription) {
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
    if (!res.ok)
        throw new Error("failed to subscribe push");
}
export async function reclassifyTask(session, taskId, kind) {
    const res = await fetch(endpoint(`/v1/tasks/${taskId}/reclassify`), {
        method: "POST",
        headers: authHeaders(session.accessToken),
        body: JSON.stringify({ kind })
    });
    if (!res.ok)
        throw new Error("failed to reclassify");
}
