import type { ConversationContext, Reminder, Task } from "@new/shared";
import { newId, newToken } from "../id";
import type { AppRepository, ChatAuditLog, Installation, PushSubscriptionRecord } from "./types";

export class MemoryRepository implements AppRepository {
  private readonly installations = new Map<string, Installation>();
  private readonly installationByToken = new Map<string, string>();
  private readonly tasks = new Map<string, Task>();
  private readonly reminders = new Map<string, Reminder>();
  private readonly contexts = new Map<string, ConversationContext>();
  private readonly pushSubs = new Map<string, PushSubscriptionRecord[]>();
  private readonly audits: ChatAuditLog[] = [];

  async createInstallation(input: { timezone: string }): Promise<Installation> {
    const now = new Date().toISOString();
    const installation: Installation = {
      installationId: newId(),
      accessToken: newToken(24),
      timezone: input.timezone,
      createdAt: now,
      updatedAt: now
    };
    this.installations.set(installation.installationId, installation);
    this.installationByToken.set(installation.accessToken, installation.installationId);
    return installation;
  }

  async findInstallationByToken(token: string): Promise<Installation | null> {
    const id = this.installationByToken.get(token);
    if (!id) return null;
    return this.installations.get(id) ?? null;
  }

  async getConversationContext(installationId: string): Promise<ConversationContext | null> {
    return this.contexts.get(installationId) ?? null;
  }

  async upsertConversationContext(context: ConversationContext): Promise<void> {
    this.contexts.set(context.installationId, context);
  }

  async clearConversationContext(installationId: string): Promise<void> {
    this.contexts.delete(installationId);
  }

  async createTask(task: Task): Promise<Task> {
    this.tasks.set(task.id, task);
    return task;
  }

  async updateTask(task: Task): Promise<Task> {
    this.tasks.set(task.id, task);
    return task;
  }

  async getTaskById(taskId: string): Promise<Task | null> {
    return this.tasks.get(taskId) ?? null;
  }

  async listTasks(installationId: string): Promise<Task[]> {
    return [...this.tasks.values()]
      .filter((task) => task.installationId === installationId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async listActiveScheduledTasks(installationId: string): Promise<Task[]> {
    return [...this.tasks.values()]
      .filter((task) => task.installationId === installationId)
      .filter((task) => task.kind === "task" && task.status === "active" && task.dueState === "scheduled")
      .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
  }

  async createReminder(reminder: Reminder): Promise<Reminder> {
    this.reminders.set(reminder.id, reminder);
    return reminder;
  }

  async updateReminder(reminder: Reminder): Promise<Reminder> {
    this.reminders.set(reminder.id, reminder);
    return reminder;
  }

  async findReminderById(reminderId: string): Promise<Reminder | null> {
    return this.reminders.get(reminderId) ?? null;
  }

  async listRemindersByTask(taskId: string): Promise<Reminder[]> {
    return [...this.reminders.values()]
      .filter((reminder) => reminder.taskId === taskId)
      .sort((a, b) => a.notifyAt.localeCompare(b.notifyAt));
  }

  async listUpcomingReminders(installationId: string): Promise<Reminder[]> {
    const taskIds = new Set(
      [...this.tasks.values()]
        .filter((task) => task.installationId === installationId)
        .map((task) => task.id)
    );

    return [...this.reminders.values()]
      .filter((reminder) => taskIds.has(reminder.taskId))
      .filter((reminder) => reminder.status === "active")
      .sort((a, b) => a.notifyAt.localeCompare(b.notifyAt));
  }

  async listDueReminders(nowIso: string): Promise<Reminder[]> {
    return [...this.reminders.values()]
      .filter((reminder) => reminder.status === "active")
      .filter((reminder) => reminder.notifyAt <= nowIso)
      .sort((a, b) => a.notifyAt.localeCompare(b.notifyAt));
  }

  async savePushSubscription(record: PushSubscriptionRecord): Promise<void> {
    const current = this.pushSubs.get(record.installationId) ?? [];
    const next = current.filter((item) => item.endpoint !== record.endpoint);
    next.push(record);
    this.pushSubs.set(record.installationId, next);
  }

  async listPushSubscriptions(installationId: string): Promise<PushSubscriptionRecord[]> {
    return this.pushSubs.get(installationId) ?? [];
  }

  async appendChatAuditLog(log: ChatAuditLog): Promise<void> {
    this.audits.push(log);
  }
}
