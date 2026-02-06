import type { ParsedOffset } from "../types";

function normalizeOffsetText(text: string): string {
  return text
    .trim()
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ");
}

export function parseOffsetText(text: string): ParsedOffset | null {
  const normalized = normalizeOffsetText(text);

  const hourBefore = normalized.match(/(\d+)\s*時間前/);
  if (hourBefore) {
    return {
      offsetMinutes: Number(hourBefore[1]) * 60,
      source: hourBefore[0]
    };
  }

  const minBefore = normalized.match(/(\d+)\s*分前/);
  if (minBefore) {
    return {
      offsetMinutes: Number(minBefore[1]),
      source: minBefore[0]
    };
  }

  if (/前日|1日前/.test(normalized)) {
    return {
      offsetMinutes: 1440,
      source: "前日"
    };
  }

  if (/時間ちょうど|ちょうど|当日/.test(normalized)) {
    return {
      offsetMinutes: 0,
      source: "当日"
    };
  }

  return null;
}

export function applyOffset(baseTimeIso: string, offsetMinutes: number): string {
  const base = new Date(baseTimeIso).getTime();
  const notify = base - offsetMinutes * 60 * 1000;
  return new Date(notify).toISOString();
}
