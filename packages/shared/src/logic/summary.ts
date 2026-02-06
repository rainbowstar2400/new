const STOP_WORDS = new Set(["こと", "です", "ます", "する", "した", "して", "ください"]);

function tokenize(text: string): string[] {
  return text
    .replace(/[\n\r]/g, " ")
    .replace(/[。、！？!?,:：]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

function normalizeForOverlap(text: string): string {
  return text.replace(/[\s。、！？!?,:：]/g, "");
}

function hasNgramOverlap(source: string, target: string): boolean {
  const s = normalizeForOverlap(source);
  const t = normalizeForOverlap(target);
  if (s.length < 2 || t.length < 2) return false;

  for (let i = 0; i < s.length - 1; i += 1) {
    const ngram = s.slice(i, i + 2);
    if (t.includes(ngram)) return true;
  }
  return false;
}

function removeLeadingDueExpression(text: string): string {
  let value = text.trim();

  value = value.replace(/^(タスク|todo|TODO)\s*[:：]?\s*/i, "");

  const patterns = [
    /^(今日|明日|明後日|今週(?:の)?\s*[月火水木金土日]曜?|来週(?:の)?\s*[月火水木金土日]曜?|再来週(?:の)?\s*[月火水木金土日]曜?|翌週(?:の)?\s*[月火水木金土日]曜?|次週(?:の)?\s*[月火水木金土日]曜?|次の\s*[月火水木金土日]曜?|今度の\s*[月火水木金土日]曜?)\s*/,
    /^(?:[0-9０-９]{4}(?:[\/／]|-|－))?[0-9０-９]{1,2}(?:[\/／]|-|－)[0-9０-９]{1,2}\s*/,
    /^[0-9０-９]{1,2}月\s*[0-9０-９]{1,2}日\s*/,
    /^(午前|午後)?\s*[0-9０-９]{1,2}(?:\s*[:：]\s*[0-9０-９]{1,2})?\s*(?:時\s*[0-9０-９]{1,2}\s*分?|時|分)?\s*/,
    /^(に|までに|まで|から|頃|ごろ)\s*/
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of patterns) {
      const next = value.replace(pattern, "");
      if (next !== value) {
        value = next.trim();
        changed = true;
      }
    }
  }

  return value;
}

function removeTrailingInstruction(text: string): string {
  return text
    .replace(/\s*(を)?(リマインドして(?:ください)?|通知して(?:ください)?|思い出させて(?:ください)?|忘れないように(?:して)?|登録して(?:ください)?|追加して(?:ください)?)\s*$/i, "")
    .replace(/[。！？!?\s]+$/g, "")
    .trim();
}

function normalizeTaskCore(text: string): string {
  const stripped = removeLeadingDueExpression(text);
  const cleaned = removeTrailingInstruction(stripped);
  return cleaned.trim();
}

export function fallbackSummarySlot(input: string): string {
  const normalized = input.trim().replace(/[\n\r]+/g, " ");
  if (!normalized) return "内容の記録";
  if (normalized.length <= 42) return normalized;
  return `${normalized.slice(0, 40)}…`;
}

export function validateSummarySlot(slot: string, source: string): boolean {
  const value = slot.trim();
  if (!value) return false;
  if (value.length > 80) return false;
  if (/\n|\r/.test(value)) return false;

  const sourceTokens = tokenize(source);
  if (sourceTokens.length > 0 && sourceTokens.some((token) => value.includes(token))) {
    return true;
  }

  return hasNgramOverlap(source, value);
}

export function normalizeSummarySlot(slot: string, source: string): string {
  const cleaned = slot.trim().replace(/[\n\r]+/g, " ");
  if (!validateSummarySlot(cleaned, source)) {
    return fallbackSummarySlot(source);
  }
  return cleaned;
}

export function normalizeTaskTitle(slot: string, source: string): string {
  const normalizedSlot = normalizeSummarySlot(slot, source);
  const sourceCandidate = normalizeTaskCore(source);
  const slotCandidate = normalizeTaskCore(normalizedSlot);

  if (sourceCandidate.length >= 2 && sourceCandidate.length <= 80) {
    return sourceCandidate;
  }

  if (slotCandidate.length >= 2 && slotCandidate.length <= 80) {
    return slotCandidate;
  }

  return normalizedSlot;
}
