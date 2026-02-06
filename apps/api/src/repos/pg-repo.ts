import { Pool } from "pg";
import type { ConversationContext, Reminder, Task } from "@new/shared";
import type { AppRepository, ChatAuditLog, Installation, PushSubscriptionRecord } from "./types";
import { newId, newToken } from "../id";

function mapTask(row: any): Task {
  return {
    id: row.id,
    installationId: row.installation_id,
    title: row.title,
    kind: row.kind,
    memoCategory: row.memo_category,
    dueState: row.due_state,
    dueAt: row.due_at,
    defaultDueTimeApplied: row.default_due_time_applied,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapReminder(row: any): Reminder {
  return {
    id: row.id,
    taskId: row.task_id,
    baseTime: row.base_time,
    offsetMinutes: row.offset_minutes,
    notifyAt: row.notify_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class PgRepository implements AppRepository {
  constructor(private readonly pool: Pool) {}

  async createInstallation(input: { timezone: string }): Promise<Installation> {
    const now = new Date().toISOString();
    const installation: Installation = {
      installationId: newId(),
      accessToken: newToken(24),
      timezone: input.timezone,
      createdAt: now,
      updatedAt: now
    };

    await this.pool.query(
      `insert into installations (id, access_token, timezone, created_at, updated_at)
       values ($1, $2, $3, $4, $5)`,
      [installation.installationId, installation.accessToken, installation.timezone, now, now]
    );

    return installation;
  }

  async findInstallationByToken(token: string): Promise<Installation | null> {
    const res = await this.pool.query(
      `select id, access_token, timezone, created_at, updated_at
       from installations where access_token = $1`,
      [token]
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      installationId: row.id,
      accessToken: row.access_token,
      timezone: row.timezone,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async getConversationContext(installationId: string): Promise<ConversationContext | null> {
    const res = await this.pool.query(
      `select * from conversation_contexts where installation_id = $1`,
      [installationId]
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      installationId: row.installation_id,
      pendingType: row.pending_type,
      candidateTaskIds: row.candidate_task_ids ?? [],
      proposedDueAt: row.proposed_due_at,
      proposedOffsetMinutes: row.proposed_offset_minutes,
      expiresAt: row.expires_at,
      payload: row.payload ?? {},
      updatedAt: row.updated_at
    };
  }

  async upsertConversationContext(context: ConversationContext): Promise<void> {
    await this.pool.query(
      `insert into conversation_contexts (
        installation_id, pending_type, candidate_task_ids,
        proposed_due_at, proposed_offset_minutes, expires_at, payload, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)
      on conflict (installation_id)
      do update set
        pending_type = excluded.pending_type,
        candidate_task_ids = excluded.candidate_task_ids,
        proposed_due_at = excluded.proposed_due_at,
        proposed_offset_minutes = excluded.proposed_offset_minutes,
        expires_at = excluded.expires_at,
        payload = excluded.payload,
        updated_at = excluded.updated_at`,
      [
        context.installationId,
        context.pendingType,
        context.candidateTaskIds,
        context.proposedDueAt,
        context.proposedOffsetMinutes,
        context.expiresAt,
        JSON.stringify(context.payload ?? {}),
        context.updatedAt
      ]
    );
  }

  async clearConversationContext(installationId: string): Promise<void> {
    await this.pool.query(`delete from conversation_contexts where installation_id = $1`, [installationId]);
  }

  async createTask(task: Task): Promise<Task> {
    await this.pool.query(
      `insert into tasks (
        id, installation_id, title, kind, memo_category,
        due_state, due_at, default_due_time_applied,
        status, created_at, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        task.id,
        task.installationId,
        task.title,
        task.kind,
        task.memoCategory,
        task.dueState,
        task.dueAt,
        task.defaultDueTimeApplied,
        task.status,
        task.createdAt,
        task.updatedAt
      ]
    );
    return task;
  }

  async updateTask(task: Task): Promise<Task> {
    await this.pool.query(
      `update tasks set
        title = $2,
        kind = $3,
        memo_category = $4,
        due_state = $5,
        due_at = $6,
        default_due_time_applied = $7,
        status = $8,
        updated_at = $9
      where id = $1`,
      [
        task.id,
        task.title,
        task.kind,
        task.memoCategory,
        task.dueState,
        task.dueAt,
        task.defaultDueTimeApplied,
        task.status,
        task.updatedAt
      ]
    );
    return task;
  }

  async getTaskById(taskId: string): Promise<Task | null> {
    const res = await this.pool.query(`select * from tasks where id = $1`, [taskId]);
    if (!res.rows[0]) return null;
    return mapTask(res.rows[0]);
  }

  async listTasks(installationId: string): Promise<Task[]> {
    const res = await this.pool.query(
      `select * from tasks where installation_id = $1 order by updated_at desc`,
      [installationId]
    );
    return res.rows.map(mapTask);
  }

  async listActiveScheduledTasks(installationId: string): Promise<Task[]> {
    const res = await this.pool.query(
      `select * from tasks
       where installation_id = $1 and kind = 'task' and status = 'active' and due_state = 'scheduled'
       order by due_at asc`,
      [installationId]
    );
    return res.rows.map(mapTask);
  }

  async createReminder(reminder: Reminder): Promise<Reminder> {
    await this.pool.query(
      `insert into reminders (
        id, task_id, base_time, offset_minutes,
        notify_at, status, created_at, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        reminder.id,
        reminder.taskId,
        reminder.baseTime,
        reminder.offsetMinutes,
        reminder.notifyAt,
        reminder.status,
        reminder.createdAt,
        reminder.updatedAt
      ]
    );
    return reminder;
  }

  async updateReminder(reminder: Reminder): Promise<Reminder> {
    await this.pool.query(
      `update reminders set
        base_time = $2,
        offset_minutes = $3,
        notify_at = $4,
        status = $5,
        updated_at = $6
      where id = $1`,
      [
        reminder.id,
        reminder.baseTime,
        reminder.offsetMinutes,
        reminder.notifyAt,
        reminder.status,
        reminder.updatedAt
      ]
    );
    return reminder;
  }

  async findReminderById(reminderId: string): Promise<Reminder | null> {
    const res = await this.pool.query(`select * from reminders where id = $1`, [reminderId]);
    if (!res.rows[0]) return null;
    return mapReminder(res.rows[0]);
  }

  async listRemindersByTask(taskId: string): Promise<Reminder[]> {
    const res = await this.pool.query(`select * from reminders where task_id = $1 order by notify_at asc`, [taskId]);
    return res.rows.map(mapReminder);
  }

  async listUpcomingReminders(installationId: string): Promise<Reminder[]> {
    const res = await this.pool.query(
      `select r.* from reminders r
       inner join tasks t on t.id = r.task_id
       where t.installation_id = $1 and r.status = 'active'
       order by r.notify_at asc`,
      [installationId]
    );
    return res.rows.map(mapReminder);
  }

  async listDueReminders(nowIso: string): Promise<Reminder[]> {
    const res = await this.pool.query(
      `select * from reminders where status = 'active' and notify_at <= $1 order by notify_at asc`,
      [nowIso]
    );
    return res.rows.map(mapReminder);
  }

  async savePushSubscription(record: PushSubscriptionRecord): Promise<void> {
    await this.pool.query(
      `insert into push_subscriptions (
        id, installation_id, endpoint, p256dh, auth, created_at, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7)
      on conflict (installation_id, endpoint)
      do update set p256dh = excluded.p256dh, auth = excluded.auth, updated_at = excluded.updated_at`,
      [
        record.id,
        record.installationId,
        record.endpoint,
        record.p256dh,
        record.auth,
        record.createdAt,
        record.updatedAt
      ]
    );
  }

  async listPushSubscriptions(installationId: string): Promise<PushSubscriptionRecord[]> {
    const res = await this.pool.query(`select * from push_subscriptions where installation_id = $1`, [installationId]);
    return res.rows.map((row) => ({
      id: row.id,
      installationId: row.installation_id,
      endpoint: row.endpoint,
      p256dh: row.p256dh,
      auth: row.auth,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async appendChatAuditLog(log: ChatAuditLog): Promise<void> {
    await this.pool.query(
      `insert into chat_audit_logs (id, installation_id, user_text, assistant_text, created_at)
       values ($1,$2,$3,$4,$5)`,
      [log.id, log.installationId, log.userText, log.assistantText, log.createdAt]
    );
  }
}
