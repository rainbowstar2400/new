import type { ConversationContext, Reminder, Task } from "@new/shared";

export type Installation = {
  installationId: string;
  accessToken: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};

export type PushSubscriptionRecord = {
  id: string;
  installationId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatAuditLog = {
  id: string;
  installationId: string;
  userText: string;
  assistantText: string;
  createdAt: string;
};

export interface AppRepository {
  createInstallation(input: { timezone: string }): Promise<Installation>;
  findInstallationByToken(token: string): Promise<Installation | null>;

  getConversationContext(installationId: string): Promise<ConversationContext | null>;
  upsertConversationContext(context: ConversationContext): Promise<void>;
  clearConversationContext(installationId: string): Promise<void>;

  createTask(task: Task): Promise<Task>;
  updateTask(task: Task): Promise<Task>;
  getTaskById(taskId: string): Promise<Task | null>;
  listTasks(installationId: string): Promise<Task[]>;
  listActiveScheduledTasks(installationId: string): Promise<Task[]>;

  createReminder(reminder: Reminder): Promise<Reminder>;
  updateReminder(reminder: Reminder): Promise<Reminder>;
  findReminderById(reminderId: string): Promise<Reminder | null>;
  listRemindersByTask(taskId: string): Promise<Reminder[]>;
  listUpcomingReminders(installationId: string): Promise<Reminder[]>;
  listDueReminders(nowIso: string): Promise<Reminder[]>;

  savePushSubscription(record: PushSubscriptionRecord): Promise<void>;
  listPushSubscriptions(installationId: string): Promise<PushSubscriptionRecord[]>;

  appendChatAuditLog(log: ChatAuditLog): Promise<void>;
}
