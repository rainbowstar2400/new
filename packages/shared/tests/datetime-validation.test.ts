import { describe, expect, it } from "vitest";
import { toParsedDueFromCandidate, validateDueParseCandidate } from "../src/logic/datetime-validation";

describe("datetime-validation", () => {
  it("validates resolved candidate", () => {
    const candidate = validateDueParseCandidate({
      state: "resolved",
      dueAt: "2026-02-08T06:00:00.000Z",
      timeProvided: true,
      reason: "ai_ok"
    });

    expect(candidate?.state).toBe("resolved");
    expect(candidate?.dueAt).toBe("2026-02-08T06:00:00.000Z");
  });

  it("applies default time for date-only candidate", () => {
    const candidate = validateDueParseCandidate({
      state: "resolved",
      dueAt: "2026-02-08T00:00:00.000Z",
      timeProvided: false,
      reason: "ai_date_only"
    });

    expect(candidate).not.toBeNull();

    const parsed = toParsedDueFromCandidate(candidate!, {
      defaultDueTime: "18:30",
      now: new Date("2026-02-07T00:00:00.000Z")
    });

    expect(parsed?.kind).toBe("date_only");
    expect(parsed?.timeProvided).toBe(false);
    expect(parsed?.dueAt).toBe("2026-02-08T09:30:00.000Z");
  });

  it("returns null for invalid resolved candidate", () => {
    const candidate = validateDueParseCandidate({
      state: "resolved",
      dueAt: null,
      timeProvided: true
    });

    expect(candidate).toBeNull();
  });
});

