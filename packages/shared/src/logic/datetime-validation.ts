import { dueParseCandidateSchema, type DueParseCandidate, type ParsedDue } from "../types";
import { formatDateLabel } from "./datetime";

type NormalizeDueOptions = {
  defaultDueTime?: string;
  now?: Date;
};

function parseDefaultTime(defaultDueTime?: string): { hours: number; minutes: number } {
  const raw = defaultDueTime ?? "09:00";
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { hours: 9, minutes: 0 };
  return {
    hours: Math.min(23, Number(match[1])),
    minutes: Math.min(59, Number(match[2]))
  };
}

export function validateDueParseCandidate(input: unknown): DueParseCandidate | null {
  const parsed = dueParseCandidateSchema.safeParse(input);
  if (!parsed.success) return null;

  const value = parsed.data;
  if (value.state === "resolved") {
    if (!value.dueAt) return null;
    if (typeof value.timeProvided !== "boolean") return null;
    const due = new Date(value.dueAt);
    if (Number.isNaN(due.getTime())) return null;
    return {
      state: "resolved",
      dueAt: due.toISOString(),
      timeProvided: value.timeProvided,
      reason: value.reason ?? "ai_resolved"
    };
  }

  if (value.dueAt !== null) return null;
  return {
    state: value.state,
    dueAt: null,
    timeProvided: null,
    reason: value.reason ?? "needs_confirmation"
  };
}

export function toParsedDueFromCandidate(
  candidate: DueParseCandidate,
  options: NormalizeDueOptions = {}
): ParsedDue | null {
  if (candidate.state !== "resolved" || !candidate.dueAt) return null;

  const due = new Date(candidate.dueAt);
  if (Number.isNaN(due.getTime())) return null;

  const timeProvided = candidate.timeProvided === true;
  if (!timeProvided) {
    const fallback = parseDefaultTime(options.defaultDueTime);
    due.setHours(fallback.hours, fallback.minutes, 0, 0);
  }

  if (options.now && due.getTime() < options.now.getTime()) {
    return null;
  }

  const iso = due.toISOString();
  return {
    kind: timeProvided ? "datetime" : "date_only",
    dueAt: iso,
    dateLabel: formatDateLabel(iso),
    timeProvided
  };
}
