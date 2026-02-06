const STOP_WORDS = new Set(["こと", "です", "ます", "する", "した", "して", "ください"]);

function tokenize(text: string): string[] {
  return text
    .replace(/[\n\r]/g, " ")
    .replace(/[。、！？!?,:：]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
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
  if (sourceTokens.length === 0) return true;

  return sourceTokens.some((token) => value.includes(token));
}

export function normalizeSummarySlot(slot: string, source: string): string {
  const cleaned = slot.trim().replace(/[\n\r]+/g, " ");
  if (!validateSummarySlot(cleaned, source)) {
    return fallbackSummarySlot(source);
  }
  return cleaned;
}
