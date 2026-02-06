import type { MemoCategory, ClassificationResult } from "../types";

const STRONG_TASK_HINTS = [
  "リマインド",
  "通知",
  "までに",
  "期限",
  "締切",
  "〆切",
  "明日",
  "明後日",
  "今日",
  "来週",
  "次の",
  "忘れない",
  "しなきゃ",
  "しないと",
  "連絡",
  "提出",
  "返信",
  "送付",
  "支払い",
  "予約"
];

const TASK_NOUN_HINTS = [
  "洗濯",
  "掃除",
  "買い物",
  "ゴミ出し",
  "皿洗い",
  "片付け",
  "請求書送付",
  "請求書提出"
];

const MEMO_HINTS = [
  "感想",
  "記録",
  "メモ",
  "覚え",
  "アイデア",
  "観察",
  "振り返り",
  "残して",
  "ログ",
  "雑記"
];

const WANT_HINTS = ["したい", "しておきたい", "取りたい", "なりたい", "目標", "やりたい", "てみたい"];
const IDEA_HINTS = ["アイデア", "案", "改善", "工夫", "ひらめき", "思いつき"];

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function squeezeText(text: string): string {
  return text.replace(/\s+/g, "");
}

function hasAny(text: string, hints: readonly string[]): boolean {
  return hints.some((hint) => text.includes(hint));
}

function hasWantExpression(text: string): boolean {
  const normalized = squeezeText(text);
  if (hasAny(normalized, WANT_HINTS)) return true;

  if (/(してみたい|やってみたい|行きたい|いきたい|会いたい|あいたい|見たい|読みたい|よみたい|書きたい|かきたい|買いたい|かいたい|作りたい|つくりたい|食べたい|たべたい|続けたい|つづけたい|始めたい|はじめたい|終わらせたい|おわらせたい|試したい|ためしたい|学びたい|まなびたい)/.test(normalized)) {
    return true;
  }

  if (/みたい(?:だ|です|な|に)/.test(normalized)) {
    return false;
  }

  if (/(?:を|に|へ|が|で|と|から|まで)[^。！？!?]{0,20}たい(?:です|な|と思う)?/.test(normalized)) {
    return true;
  }

  if (normalized.length <= 4) return false;
  return /[ぁ-んァ-ヶ一-龯ー]{2,20}たい(?:です|な)?$/.test(normalized);
}

function hasDateTimeCue(text: string): boolean {
  return (
    /(\d{1,2}\s*[:：]\s*\d{1,2}|\d{1,2}\s*時|\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}\/\d{1,2}|\d{1,2}月\d{1,2}日)/.test(text) ||
    /(明日|明後日|今日|来週|次の\s*[月火水木金土日]曜)/.test(text)
  );
}

export function detectMemoCategory(text: string): MemoCategory {
  const normalized = normalizeText(text);
  if (hasWantExpression(normalized)) return "want";
  if (hasAny(normalized, IDEA_HINTS)) return "idea";
  return "misc";
}

export function classifyInput(text: string): ClassificationResult {
  const normalized = normalizeText(text);
  if (!normalized) {
    return {
      kind: "ambiguous",
      memoCategory: null,
      confidence: 0,
      reason: "empty"
    };
  }

  const startsMemo = /^(メモ|memo|アイデア|やりたいこと)\s*[:：]?/i.test(normalized);
  const startsTask = /^(タスク|todo)\s*[:：]?/i.test(normalized);

  if (startsTask) {
    return {
      kind: "task",
      memoCategory: null,
      confidence: 0.95,
      reason: "explicit_task_prefix"
    };
  }

  if (startsMemo) {
    const category = detectMemoCategory(normalized);
    return {
      kind: "memo",
      memoCategory: category,
      confidence: 0.95,
      reason: "explicit_memo_prefix"
    };
  }

  const taskCue = hasDateTimeCue(normalized) || hasAny(normalized, STRONG_TASK_HINTS);
  const memoCue = hasAny(normalized, MEMO_HINTS);
  const wantCue = hasWantExpression(normalized);

  if (taskCue) {
    return {
      kind: "task",
      memoCategory: null,
      confidence: 0.85,
      reason: "task_cue"
    };
  }

  if (memoCue || wantCue) {
    const category = detectMemoCategory(normalized);
    return {
      kind: "memo",
      memoCategory: category,
      confidence: 0.8,
      reason: memoCue ? "memo_cue" : "want_cue"
    };
  }

  const compact = normalized.replace(/[\s。、！？!?.]/g, "");
  if (compact.length <= 12 && hasAny(compact, TASK_NOUN_HINTS)) {
    return {
      kind: "task",
      memoCategory: null,
      confidence: 0.7,
      reason: "task_noun"
    };
  }

  if (compact.length <= 16) {
    return {
      kind: "ambiguous",
      memoCategory: null,
      confidence: 0.45,
      reason: "short_unclear"
    };
  }

  return {
    kind: "ambiguous",
    memoCategory: null,
    confidence: 0.4,
    reason: "fallback_ambiguous"
  };
}
