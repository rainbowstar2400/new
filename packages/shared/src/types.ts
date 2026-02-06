import { z } from "zod";

export const dueStateSchema = z.enum(["scheduled", "no_due", "pending_due"]);
export type DueState = z.infer<typeof dueStateSchema>;

export const taskKindSchema = z.enum(["task", "memo"]);
export type TaskKind = z.infer<typeof taskKindSchema>;

export const memoCategorySchema = z.enum(["want", "idea", "misc"]);
export type MemoCategory = z.infer<typeof memoCategorySchema>;

export const taskStatusSchema = z.enum(["active", "done"]);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const taskSchema = z.object({
  id: z.string(),
  installationId: z.string(),
  title: z.string().min(1),
  kind: taskKindSchema,
  memoCategory: memoCategorySchema.nullable(),
  dueState: dueStateSchema,
  dueAt: z.string().datetime().nullable(),
  defaultDueTimeApplied: z.boolean(),
  status: taskStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type Task = z.infer<typeof taskSchema>;

export const reminderStatusSchema = z.enum(["active", "done", "canceled"]);
export type ReminderStatus = z.infer<typeof reminderStatusSchema>;

export const reminderSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  baseTime: z.string().datetime(),
  offsetMinutes: z.number().int(),
  notifyAt: z.string().datetime(),
  status: reminderStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type Reminder = z.infer<typeof reminderSchema>;

export const pendingTypeSchema = z.enum([
  "due_choice",
  "due_time_confirm",
  "task_target_confirm",
  "task_or_memo_confirm",
  "memo_category_confirm"
]);
export type PendingType = z.infer<typeof pendingTypeSchema>;

export const conversationContextSchema = z.object({
  installationId: z.string(),
  pendingType: pendingTypeSchema.nullable(),
  candidateTaskIds: z.array(z.string()),
  proposedDueAt: z.string().datetime().nullable(),
  proposedOffsetMinutes: z.number().int().nullable(),
  expiresAt: z.string().datetime().nullable(),
  payload: z.record(z.any()).default({}),
  updatedAt: z.string().datetime()
});
export type ConversationContext = z.infer<typeof conversationContextSchema>;

export const deviceSessionSchema = z.object({
  installationId: z.string(),
  accessToken: z.string(),
  timezone: z.string()
});
export type DeviceSession = z.infer<typeof deviceSessionSchema>;

export const chatMessageResponseSchema = z.object({
  assistantText: z.string(),
  summarySlot: z.string(),
  actionType: z.enum(["saved", "confirm", "error"]),
  quickChoices: z.array(z.string()),
  affectedTaskIds: z.array(z.string())
});
export type ChatMessageResponse = z.infer<typeof chatMessageResponseSchema>;

export type ClassificationResult = {
  kind: "task" | "memo" | "ambiguous";
  memoCategory: MemoCategory | null;
  confidence: number;
  reason: string;
};

export type ParsedDue = {
  kind: "datetime" | "date_only";
  dueAt: string;
  dateLabel: string;
  timeProvided: boolean;
};

export type ParsedOffset = {
  offsetMinutes: number;
  source: string;
};
