import type { ResponseTone } from "../types";

type ToneVariant = Record<ResponseTone, string>;

type ToneOptions = {
  tone?: ResponseTone;
  seed?: string;
};

type BuildOptions = {
  summary: string;
  detail?: string;
} & ToneOptions;

const DEFAULT_TONE: ResponseTone = "polite";

function normalizeTone(tone?: ResponseTone): ResponseTone {
  return tone ?? DEFAULT_TONE;
}

function normalizeSeed(seed?: string): string {
  return seed && seed.length > 0 ? seed : "default";
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickVariant(messageKey: string, variants: ToneVariant[], tone?: ResponseTone, seed?: string): string {
  const pickedTone = normalizeTone(tone);
  if (variants.length === 1) return variants[0][pickedTone];

  const stableSeed = `${messageKey}|${normalizeSeed(seed)}`;
  const index = hashSeed(stableSeed) % variants.length;
  return variants[index][pickedTone];
}

function withDetail(base: string, detail?: string): string {
  const normalizedDetail = detail?.trim();
  if (!normalizedDetail) return base;
  return `${base} ${normalizedDetail}`;
}

export function taskSavedMessage(options: BuildOptions): string {
  return withDetail(
    pickVariant(
      "task_saved",
      [
        {
          polite: `${options.summary}ですね。タスクに登録しました。`,
          friendly: `${options.summary}だね！ タスクに入れておいたよ。`,
          concise: `${options.summary}をタスク登録しました。`
        },
        {
          polite: `${options.summary}ですね。タスクとして保存しました。`,
          friendly: `${options.summary}だね。タスクとして保存しておいたよ。`,
          concise: `${options.summary}をタスク保存しました。`
        },
        {
          polite: `${options.summary}ですね。タスク化しておきました。`,
          friendly: `${options.summary}だね。タスクにしておいたよ。`,
          concise: `${options.summary}をタスク化しました。`
        }
      ],
      options.tone,
      options.seed
    ),
    options.detail
  );
}

export function memoSavedMessage(options: BuildOptions): string {
  return withDetail(
    pickVariant(
      "memo_saved",
      [
        {
          polite: `${options.summary}ですね。メモに登録しました。`,
          friendly: `${options.summary}だね！ メモに残しておいたよ。`,
          concise: `${options.summary}をメモ登録しました。`
        },
        {
          polite: `${options.summary}ですね。メモとして保存しました。`,
          friendly: `${options.summary}だね。メモとして保存しておいたよ。`,
          concise: `${options.summary}をメモ保存しました。`
        },
        {
          polite: `${options.summary}ですね。メモにしておきました。`,
          friendly: `${options.summary}だね。メモにしておいたよ。`,
          concise: `${options.summary}をメモ化しました。`
        }
      ],
      options.tone,
      options.seed
    ),
    options.detail
  );
}

export function memoCategorySavedMessage(
  summary: string,
  categoryLabel: string,
  options: ToneOptions = {}
): string {
  return pickVariant(
    "memo_category_saved",
    [
      {
        polite: `${summary}ですね。${categoryLabel}に追加しておきます。`,
        friendly: `${summary}だね！ ${categoryLabel}に追加しておくよ。`,
        concise: `${summary}を${categoryLabel}に追加しました。`
      },
      {
        polite: `${summary}ですね。${categoryLabel}として保存しました。`,
        friendly: `${summary}だね。${categoryLabel}として保存したよ。`,
        concise: `${summary}を${categoryLabel}で保存しました。`
      }
    ],
    options.tone,
    options.seed
  );
}

export function confirmTaskOrMemoMessage(summary: string, options: ToneOptions = {}): string {
  return pickVariant(
    "confirm_task_or_memo",
    [
      {
        polite: `${summary}ですね。これはタスクにしますか？メモにしますか？`,
        friendly: `${summary}だね。タスクにする？ それともメモにする？`,
        concise: `${summary}はタスクですか？ メモですか？`
      },
      {
        polite: `${summary}ですね。区分を選んでください。タスク / メモ`,
        friendly: `${summary}だね。どっちで残す？ タスク / メモ`,
        concise: `${summary}の区分を選択してください。タスク / メモ`
      }
    ],
    options.tone,
    options.seed
  );
}

export function confirmDueChoiceMessage(summary: string, options: ToneOptions = {}): string {
  return pickVariant(
    "confirm_due_choice",
    [
      {
        polite: `${summary}ですね。期日はどうしますか？ 設定する / 設定しない / 後で設定する`,
        friendly: `${summary}だね。期日はどうする？ 設定する / 設定しない / 後で設定する`,
        concise: `${summary}の期日を選択してください。設定する / 設定しない / 後で設定する`
      },
      {
        polite: `${summary}ですね。期日の扱いを選んでください。設定する / 設定しない / 後で設定する`,
        friendly: `${summary}だね。期日を決める？ それとも保留にする？`,
        concise: `${summary}の期日設定: 設定する / 設定しない / 後で設定する`
      }
    ],
    options.tone,
    options.seed
  );
}

export function confirmDateOnlyTimeMessage(dateLabel: string, options: ToneOptions = {}): string {
  return pickVariant(
    "confirm_date_only_time",
    [
      {
        polite: `期限を${dateLabel}（既定時刻）で設定します。よければ○、変更する場合は✕を選んでください。`,
        friendly: `${dateLabel}（既定時刻）で設定しようと思うけど、OKなら○、変更なら✕を選んでね。`,
        concise: `${dateLabel}（既定時刻）で設定します。○=確定 / ✕=変更`
      },
      {
        polite: `期限候補は${dateLabel}（既定時刻）です。○で確定、✕で時刻変更できます。`,
        friendly: `いまは${dateLabel}（既定時刻）で提案中。○でそのまま、✕で変更できるよ。`,
        concise: `期限候補: ${dateLabel}（既定時刻）。○で確定、✕で変更。`
      }
    ],
    options.tone,
    options.seed
  );
}

export function askDueInputMessage(summary: string, options: ToneOptions = {}): string {
  return pickVariant(
    "ask_due_input",
    [
      {
        polite: `${summary}ですね。期限の日時を入力してください。例: 来週金曜15時`,
        friendly: `${summary}だね。期限日時を教えて。例: 来週金曜15時`,
        concise: `${summary}の期限日時を入力してください。例: 来週金曜15時`
      },
      {
        polite: `${summary}ですね。期限を自然言語で入力してください。例: 来週金曜15時`,
        friendly: `${summary}だね。いつまでか自然文で入力してね。例: 来週金曜15時`,
        concise: `${summary}の期限入力を受け付けます。例: 来週金曜15時`
      }
    ],
    options.tone,
    options.seed
  );
}

export function askTargetConfirmMessage(title: string, options: ToneOptions = {}): string {
  return pickVariant(
    "ask_target_confirm",
    [
      {
        polite: `対象タスクは「${title}」で良いですか？（○/✕）`,
        friendly: `対象は「${title}」で合ってる？（○/✕）`,
        concise: `対象タスク: 「${title}」。○/✕で回答してください。`
      },
      {
        polite: `「${title}」を対象にしますか？ ○/✕ を選んでください。`,
        friendly: `「${title}」を対象にしていい？ ○か✕で教えて。`,
        concise: `対象確認: 「${title}」でよければ○、違えば✕。`
      }
    ],
    options.tone,
    options.seed
  );
}

export function emptyInputMessage(options: ToneOptions = {}): string {
  return pickVariant(
    "empty_input",
    [
      {
        polite: "入力が空です。内容を入力してから送信してください。",
        friendly: "入力が空みたい。ひとこと入れてから送ってね。",
        concise: "入力が空です。内容を入力してください。"
      }
    ],
    options.tone,
    options.seed
  );
}

export function invalidContextMessage(options: ToneOptions = {}): string {
  return pickVariant(
    "invalid_context",
    [
      {
        polite: "確認状態が不正です。もう一度入力してください。",
        friendly: "確認フローが切れてしまいました。もう一度入力してね。",
        concise: "確認状態が無効です。再入力してください。"
      }
    ],
    options.tone,
    options.seed
  );
}

export function chooseTaskOrMemoMessage(options: ToneOptions = {}): string {
  return pickVariant(
    "choose_task_or_memo",
    [
      {
        polite: "タスクかメモかを選んでください。（タスク / メモ）",
        friendly: "タスクかメモか、どちらかを選んでね。（タスク / メモ）",
        concise: "タスク / メモ を選択してください。"
      }
    ],
    options.tone,
    options.seed
  );
}

export function chooseMemoCategoryMessage(suggested?: string, options: ToneOptions = {}): string {
  const suffix = suggested ? ` 候補は${suggested}です。` : "";
  return withDetail(
    pickVariant(
      "choose_memo_category",
      [
        {
          polite: "メモの分類を選んでください。（やりたいこと / アイデア / メモ（雑多））",
          friendly: "メモの種類を選んでね。（やりたいこと / アイデア / メモ（雑多））",
          concise: "メモ分類を選択してください。（やりたいこと / アイデア / メモ（雑多））"
        }
      ],
      options.tone,
      options.seed
    ),
    suffix
  );
}

export function dueParseFailedMessage(options: ToneOptions = {}): string {
  return pickVariant(
    "due_parse_failed",
    [
      {
        polite: "期限を日時で解釈できませんでした。例: 来週金曜15時",
        friendly: "期限をうまく読み取れなかったよ。例: 来週金曜15時",
        concise: "期限日時を解釈できません。例: 来週金曜15時"
      }
    ],
    options.tone,
    options.seed
  );
}

export function chooseDueChoiceMessage(options: ToneOptions = {}): string {
  return pickVariant(
    "choose_due_choice",
    [
      {
        polite: "期日の選択肢を選んでください。（設定する / 設定しない / 後で設定する）",
        friendly: "期日の選択肢を選んでね。（設定する / 設定しない / 後で設定する）",
        concise: "期日選択: 設定する / 設定しない / 後で設定する"
      }
    ],
    options.tone,
    options.seed
  );
}

export function timeParseFailedMessage(options: ToneOptions = {}): string {
  return pickVariant(
    "time_parse_failed",
    [
      {
        polite: "時刻を解釈できませんでした。例: 18時 / 18:30",
        friendly: "時刻を読み取れなかったよ。例: 18時 / 18:30",
        concise: "時刻解釈に失敗しました。例: 18時 / 18:30"
      }
    ],
    options.tone,
    options.seed
  );
}

export function invalidProposedDueMessage(options: ToneOptions = {}): string {
  return pickVariant(
    "invalid_proposed_due",
    [
      {
        polite: "提案された期限が無効です。もう一度入力してください。",
        friendly: "提案した期限が使えない状態です。もう一度入力してね。",
        concise: "提案期限が無効です。再入力してください。"
      }
    ],
    options.tone,
    options.seed
  );
}

export function askCustomTimeMessage(options: ToneOptions = {}): string {
  return pickVariant(
    "ask_custom_time",
    [
      {
        polite: "希望する時刻を入力してください。例: 18時 / 18:30",
        friendly: "希望の時刻を教えてね。例: 18時 / 18:30",
        concise: "希望時刻を入力してください。例: 18時 / 18:30"
      }
    ],
    options.tone,
    options.seed
  );
}

export function chooseCircleCrossMessage(options: ToneOptions = {}): string {
  return pickVariant(
    "choose_circle_cross",
    [
      {
        polite: "○ か ✕ を選択してください。",
        friendly: "○ か ✕ のどちらかを選んでね。",
        concise: "○ または ✕ を選択してください。"
      }
    ],
    options.tone,
    options.seed
  );
}

export function targetResolveFailedMessage(options: ToneOptions = {}): string {
  return pickVariant(
    "target_resolve_failed",
    [
      {
        polite: "対象タスクを特定できませんでした。タスク名をもう少し詳しく入力してください。",
        friendly: "対象タスクを特定できなかったよ。もう少し詳しくタスク名を教えて。",
        concise: "対象タスクを特定できません。タスク名を詳しく入力してください。"
      }
    ],
    options.tone,
    options.seed
  );
}

export function askTargetNameMessage(options: ToneOptions = {}): string {
  return pickVariant(
    "ask_target_name",
    [
      {
        polite: "対象タスク名を入力してください。",
        friendly: "対象タスク名を入力してね。",
        concise: "対象タスク名を入力してください。"
      }
    ],
    options.tone,
    options.seed
  );
}

export function noScheduledTaskMessage(options: ToneOptions = {}): string {
  return pickVariant(
    "no_scheduled_task",
    [
      {
        polite: "対象になる期限付きタスクがありません。先にタスクを登録してください。",
        friendly: "期限付きタスクが見つからなかったよ。先にタスクを登録してね。",
        concise: "期限付きタスクがありません。先に登録してください。"
      }
    ],
    options.tone,
    options.seed
  );
}

export function missingDueForTaskMessage(options: ToneOptions = {}): string {
  return pickVariant(
    "missing_due_for_task",
    [
      {
        polite: "このタスクには期限がありません。",
        friendly: "このタスクには期限がまだないよ。",
        concise: "このタスクは期限未設定です。"
      }
    ],
    options.tone,
    options.seed
  );
}

export function reminderAdjustedMessage(title: string, offsetMinutes: number, options: ToneOptions = {}): string {
  return pickVariant(
    "reminder_adjusted",
    [
      {
        polite: `${title}のリマインドを${offsetMinutes}分前に調整しました。`,
        friendly: `${title}のリマインドを${offsetMinutes}分前に調整しておいたよ。`,
        concise: `${title}のリマインドを${offsetMinutes}分前へ更新しました。`
      },
      {
        polite: `${title}は${offsetMinutes}分前通知に変更しました。`,
        friendly: `${title}は${offsetMinutes}分前に通知するよう変更したよ。`,
        concise: `${title}を${offsetMinutes}分前通知に変更しました。`
      }
    ],
    options.tone,
    options.seed
  );
}

export function reclassifyTargetMissingMessage(options: ToneOptions = {}): string {
  return pickVariant(
    "reclassify_target_missing",
    [
      {
        polite: "再分類対象が見つかりませんでした。",
        friendly: "再分類する対象が見つからなかったよ。",
        concise: "再分類対象が見つかりません。"
      }
    ],
    options.tone,
    options.seed
  );
}

export function reclassifiedToTaskMessage(title: string, options: ToneOptions = {}): string {
  return pickVariant(
    "reclassified_to_task",
    [
      {
        polite: `${title}をタスクに変更しました。`,
        friendly: `${title}をタスクに切り替えたよ。`,
        concise: `${title}をタスクへ変更しました。`
      }
    ],
    options.tone,
    options.seed
  );
}

export function reclassifiedToMemoMessage(title: string, options: ToneOptions = {}): string {
  return pickVariant(
    "reclassified_to_memo",
    [
      {
        polite: `${title}をメモに変更しました。`,
        friendly: `${title}をメモに切り替えたよ。`,
        concise: `${title}をメモへ変更しました。`
      }
    ],
    options.tone,
    options.seed
  );
}

export function reclassifyIntentUnknownMessage(options: ToneOptions = {}): string {
  return pickVariant(
    "reclassify_intent_unknown",
    [
      {
        polite: "再分類の意図を解釈できませんでした。",
        friendly: "再分類の意図を読み取れなかったよ。",
        concise: "再分類意図を解釈できません。"
      }
    ],
    options.tone,
    options.seed
  );
}

export function pastDueNotAllowedMessage(options: ToneOptions = {}): string {
  return pickVariant(
    "past_due_not_allowed",
    [
      {
        polite: "過去日時は設定できません。期限をもう一度指定してください。",
        friendly: "過去の日時は設定できないよ。期限をもう一度指定してね。",
        concise: "過去日時は設定不可です。期限を再指定してください。"
      }
    ],
    options.tone,
    options.seed
  );
}

export function detailRemindAt(dateLabel: string, options: ToneOptions = {}): string {
  return pickVariant(
    "detail_remind_at",
    [
      {
        polite: `${dateLabel}にリマインドします。`,
        friendly: `${dateLabel}にリマインドするね。`,
        concise: `通知時刻は${dateLabel}です。`
      }
    ],
    options.tone,
    options.seed
  );
}

export function detailNoDue(options: ToneOptions = {}): string {
  return pickVariant(
    "detail_no_due",
    [
      {
        polite: "期日なしで登録しました。",
        friendly: "期日なしで登録しておいたよ。",
        concise: "期日なしで登録しました。"
      }
    ],
    options.tone,
    options.seed
  );
}

export function detailPendingDue(options: ToneOptions = {}): string {
  return pickVariant(
    "detail_pending_due",
    [
      {
        polite: "後で期日設定するタスクとして保存しました。",
        friendly: "あとで期日を決めるタスクとして保存しておいたよ。",
        concise: "後で期日設定するタスクとして保存しました。"
      }
    ],
    options.tone,
    options.seed
  );
}

export function detailAppliedSuggestedTime(options: ToneOptions = {}): string {
  return pickVariant(
    "detail_applied_suggested_time",
    [
      {
        polite: "提案した時刻で設定しました。",
        friendly: "提案した時刻で設定しておいたよ。",
        concise: "提案時刻で設定しました。"
      }
    ],
    options.tone,
    options.seed
  );
}

export function detailSetAt(dateLabel: string, options: ToneOptions = {}): string {
  return pickVariant(
    "detail_set_at",
    [
      {
        polite: `${dateLabel}に設定しました。`,
        friendly: `${dateLabel}に設定したよ。`,
        concise: `設定時刻は${dateLabel}です。`
      }
    ],
    options.tone,
    options.seed
  );
}

export function errorMessage(reason: string, options: ToneOptions = {}): string {
  return pickVariant(
    "generic_error",
    [
      {
        polite: `処理できませんでした。${reason}`,
        friendly: `うまく処理できなかったよ。${reason}`,
        concise: `処理失敗: ${reason}`
      }
    ],
    options.tone,
    options.seed
  );
}
