import type { MemoCategory, ClassificationResult } from "../types";

const TASK_HINTS = [
  "リマインド",
  "通知",
  "までに",
  "期限",
  "明日",
  "明後日",
  "今日",
  "来週",
  "次の",
  "時",
  "分",
  "忘れない",
  "しなきゃ",
  "する",
  "送る",
  "連絡"
];

const MEMO_HINTS = [
  "感想",
  "記録",
  "メモ",
  "覚え",
  "アイデア",
  "観察",
  "振り返り",
  "残して"
];

const WANT_HINTS = ["したい", "しておきたい", "取りたい", "なりたい", "目標", "やりたい"];
const IDEA_HINTS = ["アイデア", "案", "改善", "工夫", "ひらめき", "思いつき"];

export function detectMemoCategory(text: string): MemoCategory {
  const normalized = text.trim();
  if (WANT_HINTS.some((k) => normalized.includes(k))) return "want";
  if (IDEA_HINTS.some((k) => normalized.includes(k))) return "idea";
  return "misc";
}

export function classifyInput(text: string): ClassificationResult {
  const normalized = text.trim();
  if (!normalized) {
    return {
      kind: "ambiguous",
      memoCategory: null,
      confidence: 0,
      reason: "empty"
    };
  }

  const startsMemo = /^(メモ|アイデア|やりたいこと)[:：]/.test(normalized);
  const startsTask = /^(タスク|TODO|todo)[:：]/.test(normalized);

  const taskScore = TASK_HINTS.filter((k) => normalized.includes(k)).length + (startsTask ? 2 : 0);
  const memoScore = MEMO_HINTS.filter((k) => normalized.includes(k)).length + (startsMemo ? 2 : 0);

  if (startsTask || taskScore >= 2 && taskScore >= memoScore + 1) {
    return {
      kind: "task",
      memoCategory: null,
      confidence: Math.min(1, 0.6 + taskScore * 0.1),
      reason: "task_hints"
    };
  }

  if (startsMemo || memoScore >= 2 && memoScore >= taskScore + 1) {
    return {
      kind: "memo",
      memoCategory: detectMemoCategory(normalized),
      confidence: Math.min(1, 0.6 + memoScore * 0.1),
      reason: "memo_hints"
    };
  }

  if (taskScore === 0 && memoScore === 0 && normalized.length <= 16) {
    return {
      kind: "ambiguous",
      memoCategory: null,
      confidence: 0.4,
      reason: "short_unclear"
    };
  }

  if (taskScore === memoScore) {
    return {
      kind: "ambiguous",
      memoCategory: null,
      confidence: 0.45,
      reason: "tie"
    };
  }

  if (taskScore > memoScore) {
    return {
      kind: "task",
      memoCategory: null,
      confidence: 0.55,
      reason: "weak_task"
    };
  }

  return {
    kind: "memo",
    memoCategory: detectMemoCategory(normalized),
    confidence: 0.55,
    reason: "weak_memo"
  };
}
