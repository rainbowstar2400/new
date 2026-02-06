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
  return `期限を${dateLabel}に設定します。時刻はこのままで良いですか？（○/✕）`;
}

export function askDueInputMessage(summary: string): string {
  return `${summary}ですね。いつを期限にしますか？`; 
}

export function askTargetConfirmMessage(title: string): string {
  return `対象タスクは「${title}」で良いですか？（○/✕）`;
}

export function errorMessage(reason: string): string {
  return `処理できませんでした。${reason}`;
}
