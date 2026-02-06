import webpush from "web-push";
import { loadEnv } from "../env";

const env = loadEnv();

if (env.WEB_PUSH_PUBLIC_KEY && env.WEB_PUSH_PRIVATE_KEY) {
  webpush.setVapidDetails(env.WEB_PUSH_SUBJECT, env.WEB_PUSH_PUBLIC_KEY, env.WEB_PUSH_PRIVATE_KEY);
}

export type PushPayload = {
  title: string;
  body: string;
  taskId: string;
};

export type PushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export async function sendPush(
  subscription: PushSubscriptionInput,
  payload: PushPayload
): Promise<boolean> {
  if (!env.WEB_PUSH_PUBLIC_KEY || !env.WEB_PUSH_PRIVATE_KEY) {
    return false;
  }

  try {
    await webpush.sendNotification(subscription as any, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}
