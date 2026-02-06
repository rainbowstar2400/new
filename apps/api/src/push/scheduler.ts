import type { AppRepository } from "../repos/types";
import { sendPush } from "./sender";

export function startReminderScheduler(repo: AppRepository): () => void {
  const timer = setInterval(async () => {
    const nowIso = new Date().toISOString();
    const reminders = await repo.listDueReminders(nowIso);

    for (const reminder of reminders) {
      const task = await repo.getTaskById(reminder.taskId);
      if (!task) continue;

      const subscriptions = await repo.listPushSubscriptions(task.installationId);
      if (subscriptions.length === 0) continue;

      let delivered = false;
      for (const sub of subscriptions) {
        const ok = await sendPush(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          },
          {
            title: "リマインド",
            body: task.title,
            taskId: task.id
          }
        );
        delivered = delivered || ok;
      }

      if (delivered) {
        await repo.updateReminder({
          ...reminder,
          status: "done",
          updatedAt: nowIso
        });
      }
    }
  }, 60_000);

  return () => clearInterval(timer);
}
