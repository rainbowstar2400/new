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
