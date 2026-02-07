import type { MemoCategory, ClassificationResult } from "../types";

type ReasonCode =
  | "explicit_task_prefix"
  | "explicit_memo_prefix"
  | "datetime_cue"
  | "task_hint"
  | "task_noun"
  | "memo_hint"
  | "want_expression"
  | "idea_expression"
  | "short_unclear"
  | "fallback_ambiguous";

type ScoreBoard = {
  task: number;
  memo: number;
  want: number;
  idea: number;
  taskReasons: ReasonCode[];
  memoReasons: ReasonCode[];
};

const STRONG_TASK_HINTS = [
  "リマインド",
  "通知",
  "までに",
  "期限",
  "締切",
  "〆切",
  "忘れない",
  "しなきゃ",
  "しないと",
  "連絡",
  "提出",
  "返信",
  "送付",
  "支払い",
  "予約",
  "対応",
  "提出"
];

const TASK_NOUN_HINTS = [
  "洗濯",
  "掃除",
  "買い物",
  "ゴミ出し",
  "皿洗い",
  "片付け",
  "請求書送付",
  "請求書提出",
  "連絡",
  "支払い"
];

const MEMO_HINTS = [
  "感想",
  "記録",
  "メモ",
  "覚え",
  "観察",
  "振り返り",
  "残して",
  "ログ",
  "雑記",
  "メモして",
  "残しておく"
];

const WANT_HINTS = ["したい", "しておきたい", "取りたい", "なりたい", "目標", "やりたい", "てみたい"];
const IDEA_HINTS = ["アイデア", "案", "改善", "工夫", "ひらめき", "思いつき"];

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function squeezeText(text: string): string {
  return text.replace(/\s+/g, "");
}

function normalizeForDateCue(text: string): string {
  return text
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/：/g, ":")
    .replace(/／/g, "/")
    .replace(/－/g, "-");
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
  const normalized = normalizeForDateCue(text);
  return (
    /(\d{1,2}\s*[:：]\s*\d{1,2}|\d{1,2}\s*時|\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}\/\d{1,2}|\d{1,2}月\d{1,2}日)/.test(normalized) ||
    /(明日|明後日|今日|今週|来週|再来週|翌週|次週|次の\s*[月火水木金土日]曜|今度の\s*[月火水木金土日]曜)/.test(normalized)
  );
}

function makeScoreBoard(): ScoreBoard {
  return {
    task: 0,
    memo: 0,
    want: 0,
    idea: 0,
    taskReasons: [],
    memoReasons: []
  };
}

function addTaskScore(board: ScoreBoard, score: number, reason: ReasonCode): void {
  board.task += score;
  if (!board.taskReasons.includes(reason)) board.taskReasons.push(reason);
}

function addMemoScore(board: ScoreBoard, score: number, reason: ReasonCode): void {
  board.memo += score;
  if (!board.memoReasons.includes(reason)) board.memoReasons.push(reason);
}

function inferMemoCategory(board: ScoreBoard): MemoCategory {
  if (board.want >= 3 && board.want >= board.idea) return "want";
  if (board.idea >= 3) return "idea";
  return "misc";
}

function buildScoreBoard(text: string): ScoreBoard {
  const board = makeScoreBoard();
  const compact = text.replace(/[\s。、！？!?.]/g, "");

  if (hasDateTimeCue(text)) {
    addTaskScore(board, 4, "datetime_cue");
  }

  if (hasAny(text, STRONG_TASK_HINTS)) {
    addTaskScore(board, 3, "task_hint");
  }

  if (hasAny(compact, TASK_NOUN_HINTS)) {
    addTaskScore(board, compact.length <= 8 ? 3 : 2, "task_noun");
  }

  if (hasAny(text, MEMO_HINTS)) {
    addMemoScore(board, 3, "memo_hint");
  }

  if (hasWantExpression(text)) {
    addMemoScore(board, 4, "want_expression");
    board.want += 4;
  }

  if (hasAny(text, IDEA_HINTS)) {
    addMemoScore(board, 3, "idea_expression");
    board.idea += 4;
  }

  return board;
}

export function detectMemoCategory(text: string): MemoCategory {
  const normalized = normalizeText(text);
  const board = buildScoreBoard(normalized);
  return inferMemoCategory(board);
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

  const startsTask = /^(タスク|todo)\s*[:：]?/i.test(normalized);
  const startsMemo = /^(メモ|memo|アイデア|やりたいこと)\s*[:：]?/i.test(normalized);

  if (startsTask) {
    return {
      kind: "task",
      memoCategory: null,
      confidence: 0.98,
      reason: "explicit_task_prefix"
    };
  }

  if (startsMemo) {
    return {
      kind: "memo",
      memoCategory: detectMemoCategory(normalized),
      confidence: 0.98,
      reason: "explicit_memo_prefix"
    };
  }

  const board = buildScoreBoard(normalized);
  const compact = normalized.replace(/[\s。、！？!?.]/g, "");

  const maxScore = Math.max(board.task, board.memo);
  const diff = Math.abs(board.task - board.memo);

  if (maxScore < 3 || diff <= 1 || (compact.length <= 16 && board.task === 0 && board.memo === 0)) {
    return {
      kind: "ambiguous",
      memoCategory: null,
      confidence: compact.length <= 16 ? 0.45 : 0.4,
      reason: compact.length <= 16 ? "short_unclear" : "fallback_ambiguous"
    };
  }

  if (board.task > board.memo) {
    return {
      kind: "task",
      memoCategory: null,
      confidence: Math.min(0.95, 0.55 + board.task * 0.08),
      reason: board.taskReasons[0] ?? "task_hint"
    };
  }

  return {
    kind: "memo",
    memoCategory: inferMemoCategory(board),
    confidence: Math.min(0.95, 0.55 + board.memo * 0.08),
    reason: board.memoReasons[0] ?? "memo_hint"
  };
}
