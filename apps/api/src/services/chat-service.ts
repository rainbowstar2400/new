import {
  applyOffset,
  askCustomTimeMessage,
  askDueInputMessage,
  askTargetConfirmMessage,
  askTargetNameMessage,
  chooseCircleCrossMessage,
  chooseDueChoiceMessage,
  chooseMemoCategoryMessage,
  chooseTaskOrMemoMessage,
  classifyInput,
  confirmDateOnlyTimeMessage,
  confirmDueChoiceMessage,
  confirmTaskOrMemoMessage,
  detailAppliedSuggestedTime,
  detailNoDue,
  detailPendingDue,
  detailRemindAt,
  detailSetAt,
  detectMemoCategory,
  dueParseFailedMessage,
  emptyInputMessage,
  errorMessage,
  fallbackSummarySlot,
  invalidContextMessage,
  invalidProposedDueMessage,
  isPast,
  memoCategorySavedMessage,
  memoSavedMessage,
  missingDueForTaskMessage,
  noScheduledTaskMessage,
  normalizeTaskTitle,
  parseDueFromText,
  parseOffsetText,
  pastDueNotAllowedMessage,
  reminderAdjustedMessage,
  reclassifiedToMemoMessage,
  reclassifiedToTaskMessage,
  reclassifyIntentUnknownMessage,
  reclassifyTargetMissingMessage,
  targetResolveFailedMessage,
  taskSavedMessage,
  timeParseFailedMessage,
  toParsedDueFromCandidate,
  type ChatMessageResponse,
  type ClassificationResult,
  type ConfirmationType,
  type ConversationContext,
  type InputMode,
  type MemoCategory,
  type ParsedDue,
  type Reminder,
  type ResponseTone,
  type Task
} from "@new/shared";
import { newId } from "../id";
import type { AppRepository } from "../repos/types";
import type { SummaryProvider } from "../gpt/summary-slot";
import type { ClassificationProvider } from "../gpt/classifier";
import type { DueParserProvider } from "../gpt/due-parser";

type ChatInput = {
  installationId: string;
  text?: string;
  selectedChoice?: string;
  defaultDueTime?: string;
  responseTone?: ResponseTone;
};
type DueParseMode = "ai-first" | "rule-first" | "rule-only";

type DueResolution = {
  parsedDue: ParsedDue | null;
  forceConfirmation: boolean;
};

const CONTEXT_TTL_MS = 30 * 60 * 1000;
const QUICK_MEMO_CATEGORY_CHOICES = ["やりたいこと", "アイデア", "メモ（雑多）"] as const;

function nowIso(): string {
  return new Date().toISOString();
}

function contextExpired(context: ConversationContext | null): boolean {
  if (!context?.expiresAt) return false;
  return new Date(context.expiresAt).getTime() < Date.now();
}

function asChoiceOrText(input: ChatInput): string {
  return (input.selectedChoice ?? input.text ?? "").trim();
}

function memoCategoryLabel(category: MemoCategory): string {
  if (category === "want") return "やりたいこと";
  if (category === "idea") return "アイデア";
  return "メモ（雑多）";
}

function parseMemoCategoryChoice(choice: string): MemoCategory | null {
  const normalized = choice.trim();
  if (normalized === "やりたいこと" || normalized.toLowerCase() === "want") return "want";
  if (normalized === "アイデア" || normalized.toLowerCase() === "idea") return "idea";
  if (normalized === "メモ（雑多）" || normalized === "メモ" || normalized.toLowerCase() === "misc") return "misc";
  return null;
}

export class ChatService {
  constructor(
    private readonly repo: AppRepository,
    private readonly summaryProvider: SummaryProvider,
    private readonly classificationProvider: ClassificationProvider,
    private readonly dueParser: DueParserProvider,
    private readonly dueParseMode: DueParseMode = "ai-first"
  ) {}

  private resolveTone(input: ChatInput): ResponseTone {
    return input.responseTone ?? "polite";
  }

  private messageSeed(
    installationId: string,
    messageKey: string,
    summarySlot = "",
    quickChoices: readonly string[] = []
  ): string {
    return [installationId, messageKey, summarySlot, quickChoices.join("|")].join("::");
  }

  async handleMessage(input: ChatInput): Promise<ChatMessageResponse> {
    const tone = this.resolveTone(input);
    const userInput = asChoiceOrText(input);
    if (!userInput) {
      return this.withUiMeta({
        assistantText: emptyInputMessage({
          tone,
          seed: this.messageSeed(input.installationId, "empty_input")
        }),
        summarySlot: "",
        actionType: "error",
        quickChoices: [],
        affectedTaskIds: []
      });
    }

    let context = await this.repo.getConversationContext(input.installationId);
    if (contextExpired(context)) {
      await this.repo.clearConversationContext(input.installationId);
      context = null;
    }

    if (context?.pendingType) {
      const handled = this.withUiMeta(await this.handlePending(context, userInput, input, tone));
      await this.repo.appendChatAuditLog({
        id: newId(),
        installationId: input.installationId,
        userText: userInput,
        assistantText: handled.assistantText,
        createdAt: nowIso()
      });
      return handled;
    }

    const fresh = this.withUiMeta(await this.handleFresh(userInput, input, tone));
    await this.repo.appendChatAuditLog({
      id: newId(),
      installationId: input.installationId,
      userText: userInput,
      assistantText: fresh.assistantText,
      createdAt: nowIso()
    });
    return fresh;
  }

  private async handleFresh(userText: string, input: ChatInput, tone: ResponseTone): Promise<ChatMessageResponse> {
    if (this.isReclassifyCommand(userText)) {
      return this.handleReclassify(userText, input.installationId, tone);
    }

    const parsedOffset = parseOffsetText(userText);
    if (parsedOffset && userText.includes("リマインド")) {
      return this.handleOffsetRequest(userText, input.installationId, parsedOffset.offsetMinutes, tone);
    }

    const classification = await this.resolveClassification(userText);

    if (classification.kind === "ambiguous") {
      const summary = await this.safeSummary(userText, "confirm");
      await this.setContext({
        installationId: input.installationId,
        pendingType: "task_or_memo_confirm",
        candidateTaskIds: [],
        proposedDueAt: null,
        proposedOffsetMinutes: null,
        expiresAt: new Date(Date.now() + CONTEXT_TTL_MS).toISOString(),
        payload: { originalText: userText },
        updatedAt: nowIso()
      });
      return {
        assistantText: confirmTaskOrMemoMessage(summary, {
          tone,
          seed: this.messageSeed(input.installationId, "confirm_task_or_memo", summary, ["タスク", "メモ"])
        }),
        summarySlot: summary,
        actionType: "confirm",
        quickChoices: ["タスク", "メモ"],
        affectedTaskIds: []
      };
    }

    if (classification.kind === "memo") {
      const category = classification.memoCategory ?? detectMemoCategory(userText);
      const summary = await this.safeSummary(userText, "memo");
      const task = await this.createTaskRecord({
        installationId: input.installationId,
        title: summary,
        kind: "memo",
        memoCategory: category,
        dueState: "no_due",
        dueAt: null,
        defaultDueTimeApplied: false
      });
      return {
        assistantText: memoCategorySavedMessage(summary, memoCategoryLabel(category), {
          tone,
          seed: this.messageSeed(input.installationId, "memo_category_saved", summary)
        }),
        summarySlot: summary,
        actionType: "saved",
        quickChoices: [],
        affectedTaskIds: [task.id]
      };
    }

    return this.handleTaskCreation(userText, input.installationId, input.defaultDueTime, tone);
  }

  private async handleTaskCreation(
    originalText: string,
    installationId: string,
    defaultDueTime: string | undefined,
    tone: ResponseTone
  ): Promise<ChatMessageResponse> {
    const dueResolution = await this.resolveDue(originalText, defaultDueTime);
    const parsedDue = dueResolution.parsedDue;
    const summary = await this.safeTaskSummary(originalText, parsedDue?.dueAt ?? null);

    if (!parsedDue) {
      await this.setContext({
        installationId,
        pendingType: "due_choice",
        candidateTaskIds: [],
        proposedDueAt: null,
        proposedOffsetMinutes: null,
        expiresAt: new Date(Date.now() + CONTEXT_TTL_MS).toISOString(),
        payload: { originalText, summary, step: "choice" },
        updatedAt: nowIso()
      });

      return {
        assistantText: confirmDueChoiceMessage(summary, {
          tone,
          seed: this.messageSeed(installationId, "confirm_due_choice", summary, ["設定する", "設定しない", "後で設定する"])
        }),
        summarySlot: summary,
        actionType: "confirm",
        quickChoices: ["設定する", "設定しない", "後で設定する"],
        affectedTaskIds: []
      };
    }

    if (isPast(parsedDue.dueAt)) {
      return {
        assistantText: pastDueNotAllowedMessage({
          tone,
          seed: this.messageSeed(installationId, "past_due_not_allowed", summary)
        }),
        summarySlot: summary,
        actionType: "error",
        quickChoices: [],
        affectedTaskIds: []
      };
    }

    if (parsedDue.kind === "date_only") {
      await this.setContext({
        installationId,
        pendingType: "due_time_confirm",
        candidateTaskIds: [],
        proposedDueAt: parsedDue.dueAt,
        proposedOffsetMinutes: null,
        expiresAt: new Date(Date.now() + CONTEXT_TTL_MS).toISOString(),
        payload: {
          originalText,
          summary,
          step: "confirm_default_time",
          dateLabel: parsedDue.dateLabel
        },
        updatedAt: nowIso()
      });

      return {
        assistantText: confirmDateOnlyTimeMessage(parsedDue.dateLabel, {
          tone,
          seed: this.messageSeed(installationId, "confirm_date_only_time", summary, ["○", "✕"])
        }),
        summarySlot: summary,
        actionType: "confirm",
        quickChoices: ["○", "✕"],
        affectedTaskIds: []
      };
    }

    const task = await this.createTaskRecord({
      installationId,
      title: summary,
      kind: "task",
      memoCategory: null,
      dueState: "scheduled",
      dueAt: parsedDue.dueAt,
      defaultDueTimeApplied: false
    });

    await this.createReminderForTask(task, parsedDue.dueAt, 0);

    return {
      assistantText: taskSavedMessage({
        summary,
        detail: `${parsedDue.dateLabel}にリマインドします。`
      }),
      summarySlot: summary,
      actionType: "saved",
      quickChoices: [],
      affectedTaskIds: [task.id]
    };
  }

  private async handlePending(
    context: ConversationContext,
    userInput: string,
    input: ChatInput,
    tone: ResponseTone
  ): Promise<ChatMessageResponse> {
    switch (context.pendingType) {
      case "task_or_memo_confirm":
        return this.handlePendingTaskOrMemo(context, userInput, input, tone);
      case "due_choice":
        return this.handlePendingDueChoice(context, userInput, input, tone);
      case "due_time_confirm":
        return this.handlePendingDueTime(context, userInput, input, tone);
      case "task_target_confirm":
        return this.handlePendingTaskTarget(context, userInput, input, tone);
      case "memo_category_confirm":
        return this.handlePendingMemoCategory(context, userInput, input, tone);
      default:
        await this.repo.clearConversationContext(input.installationId);
        return {
          assistantText: invalidContextMessage({
            tone,
            seed: this.messageSeed(input.installationId, "invalid_context")
          }),
          summarySlot: fallbackSummarySlot(userInput),
          actionType: "error",
          quickChoices: [],
          affectedTaskIds: []
        };
    }
  }

  private async handlePendingTaskOrMemo(
    context: ConversationContext,
    userInput: string,
    input: ChatInput,
    tone: ResponseTone
  ): Promise<ChatMessageResponse> {
    const originalText = String(context.payload.originalText ?? userInput);
    const summary = String(context.payload.summary ?? (await this.safeSummary(originalText, "memo")));

    if (userInput.includes("タスク")) {
      await this.repo.clearConversationContext(input.installationId);
      return this.handleTaskCreation(originalText, input.installationId, input.defaultDueTime, tone);
    }

    if (userInput.includes("メモ")) {
      const suggestedCategory = await this.suggestMemoCategoryForExplicitMemo(originalText);
      const suggestionText = suggestedCategory
        ? `候補は${memoCategoryLabel(suggestedCategory)}です。`
        : "";

      await this.setContext({
        installationId: input.installationId,
        pendingType: "memo_category_confirm",
        candidateTaskIds: [],
        proposedDueAt: null,
        proposedOffsetMinutes: null,
        expiresAt: new Date(Date.now() + CONTEXT_TTL_MS).toISOString(),
        payload: { originalText, summary, suggestedCategory },
        updatedAt: nowIso()
      });

      return {
        assistantText: chooseMemoCategoryMessage(suggestedCategory ? memoCategoryLabel(suggestedCategory) : undefined, {
          tone,
          seed: this.messageSeed(input.installationId, "choose_memo_category", summary, [...QUICK_MEMO_CATEGORY_CHOICES])
        }),
        summarySlot: summary,
        actionType: "confirm",
        quickChoices: [...QUICK_MEMO_CATEGORY_CHOICES],
        affectedTaskIds: []
      };
    }

    return {
      assistantText: chooseTaskOrMemoMessage({
        tone,
        seed: this.messageSeed(input.installationId, "choose_task_or_memo", summary, ["タスク", "メモ"])
      }),
      summarySlot: summary,
      actionType: "confirm",
      quickChoices: ["タスク", "メモ"],
      affectedTaskIds: []
    };
  }

  private async handlePendingMemoCategory(
    context: ConversationContext,
    userInput: string,
    input: ChatInput,
    tone: ResponseTone
  ): Promise<ChatMessageResponse> {
    const originalText = String(context.payload.originalText ?? "");
    const summary = String(context.payload.summary ?? (await this.safeSummary(originalText, "memo")));
    const category = parseMemoCategoryChoice(userInput);

    if (!category) {
      const suggestedCategory = context.payload.suggestedCategory as MemoCategory | undefined;
      const suggestionText = suggestedCategory ? ` 候補は${memoCategoryLabel(suggestedCategory)}です。` : "";
      return {
        assistantText: chooseMemoCategoryMessage(suggestedCategory ? memoCategoryLabel(suggestedCategory) : undefined, {
          tone,
          seed: this.messageSeed(input.installationId, "choose_memo_category", summary, [...QUICK_MEMO_CATEGORY_CHOICES])
        }),
        summarySlot: summary,
        actionType: "confirm",
        quickChoices: [...QUICK_MEMO_CATEGORY_CHOICES],
        affectedTaskIds: []
      };
    }

    await this.repo.clearConversationContext(input.installationId);
    const task = await this.createTaskRecord({
      installationId: input.installationId,
      title: summary,
      kind: "memo",
      memoCategory: category,
      dueState: "no_due",
      dueAt: null,
      defaultDueTimeApplied: false
    });

    return {
      assistantText: memoSavedMessage({
        summary,
        detail: `${memoCategoryLabel(category)}として保存しました。`,
        tone,
        seed: this.messageSeed(input.installationId, "memo_saved", summary)
      }),
      summarySlot: summary,
      actionType: "saved",
      quickChoices: [],
      affectedTaskIds: [task.id]
    };
  }

  private async suggestMemoCategoryForExplicitMemo(text: string): Promise<MemoCategory | null> {
    const deterministic = detectMemoCategory(text);
    if (deterministic !== "misc") return deterministic;

    try {
      const ai = await this.classificationProvider(text, {
        ruleKind: "memo",
        ruleReason: "explicit_memo_choice",
        ruleConfidence: 0.6
      });

      if (ai?.kind === "memo" && ai.memoCategory && ai.memoCategory !== "misc" && ai.confidence >= 0.65) {
        return ai.memoCategory;
      }
    } catch {
      // ignore and fallback to manual selection
    }

    return null;
  }

  private async handlePendingDueChoice(
    context: ConversationContext,
    userInput: string,
    input: ChatInput,
    tone: ResponseTone
  ): Promise<ChatMessageResponse> {
    const originalText = String(context.payload.originalText ?? userInput);
    const summary = String(context.payload.summary ?? fallbackSummarySlot(originalText));
    const step = String(context.payload.step ?? "choice");

    if (step === "await_due_text") {
      const dueResolution = await this.resolveDue(userInput, input.defaultDueTime);
      const parsedDue = dueResolution.parsedDue;
      if (dueResolution.forceConfirmation || !parsedDue || isPast(parsedDue.dueAt)) {
        return {
          assistantText: dueParseFailedMessage({
            tone,
            seed: this.messageSeed(input.installationId, "due_parse_failed", summary)
          }),
          summarySlot: summary,
          actionType: "confirm",
          quickChoices: [],
          affectedTaskIds: []
        };
      }

      if (parsedDue.kind === "date_only") {
        await this.setContext({
          ...context,
          pendingType: "due_time_confirm",
          proposedDueAt: parsedDue.dueAt,
          payload: {
            originalText,
            summary,
            step: "confirm_default_time",
            dateLabel: parsedDue.dateLabel
          },
          updatedAt: nowIso(),
          expiresAt: new Date(Date.now() + CONTEXT_TTL_MS).toISOString()
        });

        return {
          assistantText: confirmDateOnlyTimeMessage(parsedDue.dateLabel, {
          tone,
          seed: this.messageSeed(input.installationId, "confirm_date_only_time", summary, ["○", "✕"])
        }),
          summarySlot: summary,
          actionType: "confirm",
          confirmationType: "due_time_confirm",
          quickChoices: ["○", "✕"],
          affectedTaskIds: []
        };
      }

      await this.repo.clearConversationContext(input.installationId);
      const task = await this.createTaskRecord({
        installationId: input.installationId,
        title: summary,
        kind: "task",
        memoCategory: null,
        dueState: "scheduled",
        dueAt: parsedDue.dueAt,
        defaultDueTimeApplied: false
      });
      await this.createReminderForTask(task, parsedDue.dueAt, 0);

      return {
        assistantText: taskSavedMessage({
          summary,
          detail: detailRemindAt(parsedDue.dateLabel, {
            tone,
            seed: this.messageSeed(input.installationId, "detail_remind_at", summary)
          }),
          tone,
          seed: this.messageSeed(input.installationId, "task_saved", summary)
        }),
        summarySlot: summary,
        actionType: "saved",
        quickChoices: [],
        affectedTaskIds: [task.id]
      };
    }

    if (userInput === "設定する") {
      await this.setContext({
        ...context,
        payload: { ...context.payload, step: "await_due_text" },
        updatedAt: nowIso(),
        expiresAt: new Date(Date.now() + CONTEXT_TTL_MS).toISOString()
      });
      return {
        assistantText: askDueInputMessage(summary, {
          tone,
          seed: this.messageSeed(input.installationId, "ask_due_input", summary)
        }),
        summarySlot: summary,
        actionType: "confirm",
        confirmationType: "due_choice",
        quickChoices: [],
        affectedTaskIds: []
      };
    }

    if (userInput === "設定しない") {
      await this.repo.clearConversationContext(input.installationId);
      const task = await this.createTaskRecord({
        installationId: input.installationId,
        title: summary,
        kind: "task",
        memoCategory: null,
        dueState: "no_due",
        dueAt: null,
        defaultDueTimeApplied: false
      });
      return {
        assistantText: taskSavedMessage({
          summary,
          detail: detailNoDue({
            tone,
            seed: this.messageSeed(input.installationId, "detail_no_due", summary)
          }),
          tone,
          seed: this.messageSeed(input.installationId, "task_saved", summary)
        }),
        summarySlot: summary,
        actionType: "saved",
        quickChoices: [],
        affectedTaskIds: [task.id]
      };
    }

    if (userInput === "後で設定する") {
      await this.repo.clearConversationContext(input.installationId);
      const task = await this.createTaskRecord({
        installationId: input.installationId,
        title: summary,
        kind: "task",
        memoCategory: null,
        dueState: "pending_due",
        dueAt: null,
        defaultDueTimeApplied: false
      });
      return {
        assistantText: taskSavedMessage({
          summary,
          detail: detailPendingDue({
            tone,
            seed: this.messageSeed(input.installationId, "detail_pending_due", summary)
          }),
          tone,
          seed: this.messageSeed(input.installationId, "task_saved", summary)
        }),
        summarySlot: summary,
        actionType: "saved",
        quickChoices: [],
        affectedTaskIds: [task.id]
      };
    }

    return {
      assistantText: chooseDueChoiceMessage({
        tone,
        seed: this.messageSeed(input.installationId, "choose_due_choice", summary, ["設定する", "設定しない", "後で設定する"])
      }),
      summarySlot: summary,
      actionType: "confirm",
      quickChoices: ["設定する", "設定しない", "後で設定する"],
      affectedTaskIds: []
    };
  }

  private async handlePendingDueTime(
    context: ConversationContext,
    userInput: string,
    input: ChatInput,
    tone: ResponseTone
  ): Promise<ChatMessageResponse> {
    const originalText = String(context.payload.originalText ?? userInput);
    const summary = String(context.payload.summary ?? fallbackSummarySlot(originalText));
    const step = String(context.payload.step ?? "confirm_default_time");

    if (step === "await_custom_time") {
      const dueResolution = await this.resolveDue(`${originalText} ${userInput}`, input.defaultDueTime);
      const parsedDue = dueResolution.parsedDue;
      if (dueResolution.forceConfirmation || !parsedDue || !parsedDue.timeProvided || isPast(parsedDue.dueAt)) {
        return {
          assistantText: timeParseFailedMessage({
            tone,
            seed: this.messageSeed(input.installationId, "time_parse_failed", summary)
          }),
          summarySlot: summary,
          actionType: "confirm",
          quickChoices: [],
          affectedTaskIds: []
        };
      }

      await this.repo.clearConversationContext(input.installationId);
      const task = await this.createTaskRecord({
        installationId: input.installationId,
        title: summary,
        kind: "task",
        memoCategory: null,
        dueState: "scheduled",
        dueAt: parsedDue.dueAt,
        defaultDueTimeApplied: false
      });
      await this.createReminderForTask(task, parsedDue.dueAt, 0);

      return {
        assistantText: taskSavedMessage({
          summary,
          detail: detailSetAt(parsedDue.dateLabel, {
            tone,
            seed: this.messageSeed(input.installationId, "detail_set_at", summary)
          }),
          tone,
          seed: this.messageSeed(input.installationId, "task_saved", summary)
        }),
        summarySlot: summary,
        actionType: "saved",
        quickChoices: [],
        affectedTaskIds: [task.id]
      };
    }

    if (userInput === "○") {
      const dueAt = context.proposedDueAt;
      if (!dueAt || isPast(dueAt)) {
        return {
          assistantText: invalidProposedDueMessage({
            tone,
            seed: this.messageSeed(input.installationId, "invalid_proposed_due", summary)
          }),
          summarySlot: summary,
          actionType: "error",
          quickChoices: [],
          affectedTaskIds: []
        };
      }

      await this.repo.clearConversationContext(input.installationId);
      const task = await this.createTaskRecord({
        installationId: input.installationId,
        title: summary,
        kind: "task",
        memoCategory: null,
        dueState: "scheduled",
        dueAt,
        defaultDueTimeApplied: true
      });
      await this.createReminderForTask(task, dueAt, 0);

      return {
        assistantText: taskSavedMessage({
          summary,
          detail: detailAppliedSuggestedTime({
            tone,
            seed: this.messageSeed(input.installationId, "detail_applied_suggested_time", summary)
          }),
          tone,
          seed: this.messageSeed(input.installationId, "task_saved", summary)
        }),
        summarySlot: summary,
        actionType: "saved",
        quickChoices: [],
        affectedTaskIds: [task.id]
      };
    }

    if (userInput === "✕") {
      await this.setContext({
        ...context,
        payload: { ...context.payload, step: "await_custom_time" },
        expiresAt: new Date(Date.now() + CONTEXT_TTL_MS).toISOString(),
        updatedAt: nowIso()
      });
      return {
        assistantText: askCustomTimeMessage({
          tone,
          seed: this.messageSeed(input.installationId, "ask_custom_time", summary)
        }),
        summarySlot: summary,
        actionType: "confirm",
        confirmationType: "due_time_confirm",
        quickChoices: [],
        affectedTaskIds: []
      };
    }

    return {
      assistantText: chooseCircleCrossMessage({
        tone,
        seed: this.messageSeed(input.installationId, "choose_circle_cross", summary, ["○", "✕"])
      }),
      summarySlot: summary,
      actionType: "confirm",
      confirmationType: "due_time_confirm",
      quickChoices: ["○", "✕"],
      affectedTaskIds: []
    };
  }

  private async handlePendingTaskTarget(
    context: ConversationContext,
    userInput: string,
    input: ChatInput,
    tone: ResponseTone
  ): Promise<ChatMessageResponse> {
    const offsetMinutes = context.proposedOffsetMinutes ?? 0;
    const candidateIds = context.candidateTaskIds;
    const step = String(context.payload.step ?? "confirm");
    const index = Number(context.payload.candidateIndex ?? 0);

    if (step === "await_target_text") {
      const tasks = await this.repo.listActiveScheduledTasks(input.installationId);
      const candidates = tasks.filter((task) => task.title.includes(userInput));
      if (candidates.length === 1) {
        await this.repo.clearConversationContext(input.installationId);
        return this.applyOffsetToTask(candidates[0], offsetMinutes, tone);
      }
      if (candidates.length > 1) {
        const first = candidates[0];
        await this.setContext({
          ...context,
          candidateTaskIds: candidates.map((task) => task.id),
          payload: { ...context.payload, step: "confirm", candidateIndex: 0 },
          updatedAt: nowIso(),
          expiresAt: new Date(Date.now() + CONTEXT_TTL_MS).toISOString()
        });
        return {
          assistantText: askTargetConfirmMessage(first.title, {
            tone,
            seed: this.messageSeed(input.installationId, "ask_target_confirm", first.title, ["○", "✕"])
          }),
          summarySlot: first.title,
          actionType: "confirm",
          confirmationType: "task_target_confirm",
          quickChoices: ["○", "✕"],
          affectedTaskIds: []
        };
      }

      return {
        assistantText: targetResolveFailedMessage({
          tone,
          seed: this.messageSeed(input.installationId, "target_resolve_failed")
        }),
        summarySlot: "",
        actionType: "confirm",
        confirmationType: "task_target_confirm",
        quickChoices: [],
        affectedTaskIds: []
      };
    }

    const selectedTaskId = candidateIds[index] ?? candidateIds[0];
    const selectedTask = selectedTaskId ? await this.repo.getTaskById(selectedTaskId) : null;
    if (!selectedTask) {
      await this.repo.clearConversationContext(input.installationId);
      return {
        assistantText: errorMessage("対象タスクが見つかりません。", {
          tone,
          seed: this.messageSeed(input.installationId, "target_missing")
        }),
        summarySlot: "",
        actionType: "error",
        quickChoices: [],
        affectedTaskIds: []
      };
    }

    if (userInput === "○") {
      await this.repo.clearConversationContext(input.installationId);
      return this.applyOffsetToTask(selectedTask, offsetMinutes, tone);
    }

    if (userInput === "✕") {
      await this.setContext({
        ...context,
        payload: { ...context.payload, step: "await_target_text" },
        updatedAt: nowIso(),
        expiresAt: new Date(Date.now() + CONTEXT_TTL_MS).toISOString()
      });
      return {
        assistantText: askTargetNameMessage({
          tone,
          seed: this.messageSeed(input.installationId, "ask_target_name", selectedTask.title)
        }),
        summarySlot: selectedTask.title,
        actionType: "confirm",
        confirmationType: "task_target_confirm",
        quickChoices: [],
        affectedTaskIds: []
      };
    }

    return {
      assistantText: chooseCircleCrossMessage({
        tone,
        seed: this.messageSeed(input.installationId, "choose_circle_cross", selectedTask.title, ["○", "✕"])
      }),
      summarySlot: selectedTask.title,
      actionType: "confirm",
      confirmationType: "task_target_confirm",
      quickChoices: ["○", "✕"],
      affectedTaskIds: []
    };
  }

  private async handleOffsetRequest(
    userText: string,
    installationId: string,
    offsetMinutes: number,
    tone: ResponseTone
  ): Promise<ChatMessageResponse> {
    const tasks = await this.repo.listActiveScheduledTasks(installationId);
    if (tasks.length === 0) {
      return {
        assistantText: noScheduledTaskMessage({
          tone,
          seed: this.messageSeed(installationId, "no_scheduled_task")
        }),
        summarySlot: "",
        actionType: "error",
        quickChoices: [],
        affectedTaskIds: []
      };
    }

    if (tasks.length === 1) {
      return this.applyOffsetToTask(tasks[0], offsetMinutes, tone);
    }

    const exact = tasks.find((task) => userText.includes(task.title));
    if (exact) {
      return this.applyOffsetToTask(exact, offsetMinutes, tone);
    }

    await this.setContext({
      installationId,
      pendingType: "task_target_confirm",
      candidateTaskIds: tasks.slice(0, 5).map((task) => task.id),
      proposedDueAt: null,
      proposedOffsetMinutes: offsetMinutes,
      expiresAt: new Date(Date.now() + CONTEXT_TTL_MS).toISOString(),
      payload: { step: "confirm", candidateIndex: 0 },
      updatedAt: nowIso()
    });

    return {
      assistantText: askTargetConfirmMessage(tasks[0].title, {
        tone,
        seed: this.messageSeed(installationId, "ask_target_confirm", tasks[0].title, ["○", "✕"])
      }),
      summarySlot: tasks[0].title,
      actionType: "confirm",
      confirmationType: "task_target_confirm",
      quickChoices: ["○", "✕"],
      affectedTaskIds: []
    };
  }

  private async applyOffsetToTask(task: Task, offsetMinutes: number, tone: ResponseTone): Promise<ChatMessageResponse> {
    const reminders = await this.repo.listRemindersByTask(task.id);
    let reminder = reminders.find((item) => item.status === "active") ?? null;

    if (!task.dueAt) {
      return {
        assistantText: missingDueForTaskMessage({
          tone,
          seed: this.messageSeed(task.installationId, "missing_due_for_task", task.title)
        }),
        summarySlot: task.title,
        actionType: "error",
        quickChoices: [],
        affectedTaskIds: []
      };
    }

    const notifyAt = applyOffset(task.dueAt, offsetMinutes);
    const now = nowIso();
    if (!reminder) {
      reminder = {
        id: newId(),
        taskId: task.id,
        baseTime: task.dueAt,
        offsetMinutes,
        notifyAt,
        status: "active",
        createdAt: now,
        updatedAt: now
      };
      await this.repo.createReminder(reminder);
    } else {
      reminder = {
        ...reminder,
        offsetMinutes,
        notifyAt,
        updatedAt: now
      };
      await this.repo.updateReminder(reminder);
    }

    return {
      assistantText: reminderAdjustedMessage(task.title, offsetMinutes, {
        tone,
        seed: this.messageSeed(task.installationId, "reminder_adjusted", task.title)
      }),
      summarySlot: task.title,
      actionType: "saved",
      quickChoices: [],
      affectedTaskIds: [task.id]
    };
  }

  private isReclassifyCommand(text: string): boolean {
    return (
      text.includes("さっき") &&
      ((text.includes("メモ") && text.includes("タスク")) ||
        (text.includes("タスク") && text.includes("メモ")))
    );
  }

  private async handleReclassify(text: string, installationId: string, tone: ResponseTone): Promise<ChatMessageResponse> {
    const tasks = await this.repo.listTasks(installationId);
    const latest = tasks[0];
    if (!latest) {
      return {
        assistantText: reclassifyTargetMissingMessage({
          tone,
          seed: this.messageSeed(installationId, "reclassify_target_missing")
        }),
        summarySlot: "",
        actionType: "error",
        quickChoices: [],
        affectedTaskIds: []
      };
    }

    const now = nowIso();
    if (text.includes("メモじゃなくてタスク")) {
      const updated: Task = {
        ...latest,
        kind: "task",
        memoCategory: null,
        updatedAt: now
      };
      await this.repo.updateTask(updated);
      return {
        assistantText: reclassifiedToTaskMessage(updated.title, {
          tone,
          seed: this.messageSeed(installationId, "reclassified_to_task", updated.title)
        }),
        summarySlot: updated.title,
        actionType: "saved",
        quickChoices: [],
        affectedTaskIds: [updated.id]
      };
    }

    if (text.includes("タスクじゃなくてメモ")) {
      const updated: Task = {
        ...latest,
        kind: "memo",
        memoCategory: latest.memoCategory ?? "misc",
        dueState: "no_due",
        dueAt: null,
        updatedAt: now
      };
      await this.repo.updateTask(updated);
      return {
        assistantText: reclassifiedToMemoMessage(updated.title, {
          tone,
          seed: this.messageSeed(installationId, "reclassified_to_memo", updated.title)
        }),
        summarySlot: updated.title,
        actionType: "saved",
        quickChoices: [],
        affectedTaskIds: [updated.id]
      };
    }

    return {
      assistantText: reclassifyIntentUnknownMessage({
        tone,
        seed: this.messageSeed(installationId, "reclassify_intent_unknown")
      }),
      summarySlot: latest.title,
      actionType: "error",
      quickChoices: [],
      affectedTaskIds: []
    };
  }

  private async createTaskRecord(input: {
    installationId: string;
    title: string;
    kind: "task" | "memo";
    memoCategory: MemoCategory | null;
    dueState: "scheduled" | "no_due" | "pending_due";
    dueAt: string | null;
    defaultDueTimeApplied: boolean;
  }): Promise<Task> {
    const now = nowIso();
    const task: Task = {
      id: newId(),
      installationId: input.installationId,
      title: input.title,
      kind: input.kind,
      memoCategory: input.memoCategory,
      dueState: input.dueState,
      dueAt: input.dueAt,
      defaultDueTimeApplied: input.defaultDueTimeApplied,
      status: "active",
      createdAt: now,
      updatedAt: now
    };
    return this.repo.createTask(task);
  }

  private async createReminderForTask(task: Task, baseTime: string, offsetMinutes: number): Promise<Reminder> {
    const now = nowIso();
    const reminder: Reminder = {
      id: newId(),
      taskId: task.id,
      baseTime,
      offsetMinutes,
      notifyAt: applyOffset(baseTime, offsetMinutes),
      status: "active",
      createdAt: now,
      updatedAt: now
    };
    return this.repo.createReminder(reminder);
  }

  private async setContext(context: ConversationContext): Promise<void> {
    await this.repo.upsertConversationContext(context);
  }

  private async resolveClassification(text: string): Promise<ClassificationResult> {
    const deterministic = classifyInput(text);

    if (
      deterministic.reason === "explicit_task_prefix" ||
      deterministic.reason === "explicit_memo_prefix"
    ) {
      return deterministic;
    }

    try {
      const ai = await this.classificationProvider(text, {
        ruleKind: deterministic.kind,
        ruleReason: deterministic.reason,
        ruleConfidence: deterministic.confidence
      });

      if (!ai) return deterministic;
      return this.pickClassification(deterministic, ai);
    } catch {
      return deterministic;
    }
  }

  private pickClassification(
    deterministic: ClassificationResult,
    ai: ClassificationResult
  ): ClassificationResult {
    if (ai.confidence < 0.6) return deterministic;

    if (deterministic.kind === "ambiguous") {
      if (ai.kind !== "ambiguous" && ai.confidence >= 0.7) {
        return ai;
      }
      return deterministic;
    }

    if (ai.kind === "ambiguous") return deterministic;

    if (ai.kind !== deterministic.kind) {
      if (ai.confidence >= 0.9 && ai.confidence >= deterministic.confidence + 0.15) {
        return ai;
      }
      return deterministic;
    }

    if (ai.kind === "memo" && deterministic.kind === "memo") {
      if (ai.memoCategory && ai.memoCategory !== "misc" && ai.confidence >= 0.7) {
        return { ...deterministic, memoCategory: ai.memoCategory, confidence: ai.confidence, reason: ai.reason };
      }
      return deterministic;
    }

    if (ai.confidence >= deterministic.confidence + 0.1) {
      return ai;
    }

    return deterministic;
  }


  private withUiMeta(response: ChatMessageResponse): ChatMessageResponse {
    const confirmationType = response.confirmationType ?? this.inferConfirmationType(response);
    const inputMode = response.inputMode ?? this.inferInputMode(response, confirmationType);
    const negativeChoice = response.negativeChoice ?? (inputMode === "choice_then_text_on_negative" ? "✕" : null);

    return {
      ...response,
      inputMode,
      confirmationType,
      negativeChoice
    };
  }

  private inferConfirmationType(response: ChatMessageResponse): ConfirmationType | null {
    const choices = response.quickChoices;
    const text = response.assistantText;

    if (choices.includes("タスク") && choices.includes("メモ")) return "task_or_memo";
    if (choices.includes("やりたいこと") || choices.includes("アイデア") || choices.includes("メモ（雑多）")) {
      return "memo_category";
    }
    if (choices.includes("設定する") && choices.includes("設定しない") && choices.includes("後で設定する")) {
      return "due_choice";
    }
    if (choices.includes("○") && choices.includes("✕")) {
      return text.includes("対象タスク") ? "task_target_confirm" : "due_time_confirm";
    }

    if (response.actionType !== "confirm") return null;

    if (text.includes("タスクにしますか？メモにしますか")) return "task_or_memo";
    if (text.includes("メモの分類")) return "memo_category";
    if (text.includes("期日はどうしますか") || text.includes("いつを期限")) return "due_choice";
    if (text.includes("時刻") || text.includes("○/✕")) return "due_time_confirm";
    if (text.includes("対象タスク")) return "task_target_confirm";

    return null;
  }

  private inferInputMode(
    response: ChatMessageResponse,
    confirmationType: ConfirmationType | null
  ): InputMode {
    if (confirmationType === null) return "free_text";
    if (response.quickChoices.length === 0) return "free_text";

    if (response.quickChoices.includes("○") && response.quickChoices.includes("✕")) {
      return "choice_then_text_on_negative";
    }

    return "choice_only";
  }

  private async resolveDue(text: string, defaultDueTime?: string): Promise<DueResolution> {
    const resolveRule = (): ParsedDue | null => parseDueFromText(text, { defaultDueTime });

    if (this.dueParseMode === "rule-only") {
      return { parsedDue: resolveRule(), forceConfirmation: false };
    }

    if (this.dueParseMode === "rule-first") {
      const ruleParsed = resolveRule();
      if (ruleParsed) {
        return { parsedDue: ruleParsed, forceConfirmation: false };
      }

      const aiParsed = await this.tryResolveDueWithAi(text, defaultDueTime);
      if (aiParsed.usedAi) {
        return {
          parsedDue: aiParsed.parsedDue,
          forceConfirmation: aiParsed.forceConfirmation
        };
      }

      return { parsedDue: null, forceConfirmation: false };
    }

    const aiParsed = await this.tryResolveDueWithAi(text, defaultDueTime);
    if (aiParsed.usedAi) {
      return {
        parsedDue: aiParsed.parsedDue,
        forceConfirmation: aiParsed.forceConfirmation
      };
    }

    return { parsedDue: resolveRule(), forceConfirmation: false };
  }

  private async tryResolveDueWithAi(
    text: string,
    defaultDueTime?: string
  ): Promise<{ usedAi: boolean; parsedDue: ParsedDue | null; forceConfirmation: boolean }> {
    const candidate = await this.dueParser(text, {
      defaultDueTime,
      nowIso: nowIso()
    });

    if (!candidate) {
      return { usedAi: false, parsedDue: null, forceConfirmation: false };
    }

    if (candidate.state !== "resolved") {
      return { usedAi: true, parsedDue: null, forceConfirmation: true };
    }

    const parsedDue = toParsedDueFromCandidate(candidate, {
      defaultDueTime,
      now: new Date()
    });

    if (!parsedDue) {
      return { usedAi: true, parsedDue: null, forceConfirmation: true };
    }

    return { usedAi: true, parsedDue, forceConfirmation: false };
  }

  private async safeTaskSummary(text: string, dueAt?: string | null): Promise<string> {
    const slot = await this.safeSummary(text, "task", dueAt ?? null);
    return normalizeTaskTitle(slot, text);
  }

  private async safeSummary(
    text: string,
    kind: "task" | "memo" | "confirm",
    dueAt?: string | null
  ): Promise<string> {
    try {
      return await this.summaryProvider(text, { kind, dueAt: dueAt ?? null });
    } catch {
      return fallbackSummarySlot(text);
    }
  }
}




















