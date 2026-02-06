import type { ParsedDue } from "../types";

type ParseOptions = {
  now?: Date;
  defaultDueTime?: string;
};

const WEEKDAY_MAP: Record<string, number> = {
  "日": 0,
  "月": 1,
  "火": 2,
  "水": 3,
  "木": 4,
  "金": 5,
  "土": 6
};

type ParsedTime = { hours: number; minutes: number; provided: boolean };

function adjustByMeridiem(meridiem: string | undefined, hour: number): number {
  if (!meridiem) return hour;
  if (meridiem === "午後" && hour < 12) return hour + 12;
  if (meridiem === "午前" && hour === 12) return 0;
  return hour;
}

function parseTime(text: string): ParsedTime {
  const hm = text.match(/(午前|午後)?\s*(\d{1,2})\s*[:：]\s*(\d{1,2})/);
  if (hm) {
    const hour = adjustByMeridiem(hm[1], Number(hm[2]));
    return {
      hours: Math.min(23, hour),
      minutes: Math.min(59, Number(hm[3])),
      provided: true
    };
  }

  const hWithMinute = text.match(/(午前|午後)?\s*(\d{1,2})\s*時\s*(\d{1,2})\s*分/);
  if (hWithMinute) {
    const hour = adjustByMeridiem(hWithMinute[1], Number(hWithMinute[2]));
    return {
      hours: Math.min(23, hour),
      minutes: Math.min(59, Number(hWithMinute[3])),
      provided: true
    };
  }

  const hOnly = text.match(/(午前|午後)?\s*(\d{1,2})\s*時/);
  if (hOnly) {
    const hour = adjustByMeridiem(hOnly[1], Number(hOnly[2]));
    return {
      hours: Math.min(23, hour),
      minutes: 0,
      provided: true
    };
  }

  if (text.includes("正午")) {
    return { hours: 12, minutes: 0, provided: true };
  }

  return { hours: 9, minutes: 0, provided: false };
}

function parseDefaultTime(defaultDueTime?: string): { hours: number; minutes: number } {
  const raw = defaultDueTime ?? "09:00";
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { hours: 9, minutes: 0 };
  return {
    hours: Math.min(23, Number(match[1])),
    minutes: Math.min(59, Number(match[2]))
  };
}

function atDate(base: Date, daysToAdd: number): Date {
  const d = new Date(base);
  d.setDate(base.getDate() + daysToAdd);
  return d;
}

function parseDate(text: string, now: Date): Date | null {
  if (text.includes("明後日")) return atDate(now, 2);
  if (text.includes("明日")) return atDate(now, 1);
  if (text.includes("今日")) return atDate(now, 0);

  const weekday = text.match(/(?:来週|次の)\s*([月火水木金土日])曜/);
  if (weekday) {
    const target = WEEKDAY_MAP[weekday[1]];
    const current = now.getDay();
    let delta = target - current;
    if (delta <= 0) delta += 7;
    if (text.includes("来週")) delta += 7;
    return atDate(now, delta);
  }

  const ymd = text.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (ymd) {
    return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  }

  const jpMd = text.match(/(\d{1,2})月\s*(\d{1,2})日/);
  if (jpMd) {
    const candidate = new Date(now.getFullYear(), Number(jpMd[1]) - 1, Number(jpMd[2]));
    if (candidate.getTime() < now.getTime()) {
      candidate.setFullYear(candidate.getFullYear() + 1);
    }
    return candidate;
  }

  const md = text.match(/(\d{1,2})\/(\d{1,2})/);
  if (md) {
    const candidate = new Date(now.getFullYear(), Number(md[1]) - 1, Number(md[2]));
    if (candidate.getTime() < now.getTime()) {
      candidate.setFullYear(candidate.getFullYear() + 1);
    }
    return candidate;
  }

  if (/(\d{1,2}\s*時|\d{1,2}\s*[:：]\s*\d{1,2}|正午)/.test(text)) {
    return atDate(now, 0);
  }

  return null;
}

export function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

export function parseDueFromText(text: string, options: ParseOptions = {}): ParsedDue | null {
  const now = options.now ?? new Date();
  const date = parseDate(text, now);
  if (!date) return null;

  const detectedTime = parseTime(text);
  const fallback = parseDefaultTime(options.defaultDueTime);
  const hours = detectedTime.provided ? detectedTime.hours : fallback.hours;
  const minutes = detectedTime.provided ? detectedTime.minutes : fallback.minutes;

  const due = new Date(date);
  due.setHours(hours, minutes, 0, 0);

  return {
    kind: detectedTime.provided ? "datetime" : "date_only",
    dueAt: due.toISOString(),
    dateLabel: formatDateLabel(due.toISOString()),
    timeProvided: detectedTime.provided
  };
}

export function isPast(iso: string, now: Date = new Date()): boolean {
  return new Date(iso).getTime() < now.getTime();
}
