type BuildOptions = {
  summary: string;
  detail?: string;
};

export function taskSavedMessage(options: BuildOptions): string {
  const suffix = options.detail ? ` ${options.detail}` : "";
  return `${options.summary}ですね。タスクに登録しました。${suffix}`.trim();
}

export function memoSavedMessage(options: BuildOptions): string {
  const suffix = options.detail ? ` ${options.detail}` : "";
  return `${options.summary}ですね。メモに登録しました。${suffix}`.trim();
}

export function memoCategorySavedMessage(summary: string, categoryLabel: string): string {
  return `${summary}ですね。${categoryLabel}に追加しておきます。`;
}

export function confirmTaskOrMemoMessage(summary: string): string {
  return `${summary}ですね。これはタスクにしますか？メモにしますか？`;
}

export function confirmDueChoiceMessage(summary: string): string {
  return `${summary}ですね。期日はどうしますか？ 設定する / 設定しない / 後で設定する`;
}

export function confirmDateOnlyTimeMessage(dateLabel: string): string {
  return `期限を${dateLabel}（既定時刻）で設定します。よければ○、変更する場合は✕を選んでください。`;
}

export function askDueInputMessage(summary: string): string {
  return `${summary}ですね。期限の日時を入力してください。例: 来週金曜15時`;
}

export function askTargetConfirmMessage(title: string): string {
  return `対象タスクは「${title}」で良いですか？（○/✕）`;
}

export function errorMessage(reason: string): string {
  return `処理できませんでした。${reason}`;
}
