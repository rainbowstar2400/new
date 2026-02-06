import { describe, expect, it } from "vitest";
import { parseDueFromText } from "../src/logic/datetime";

describe("parseDueFromText", () => {
  const now = new Date(2026, 1, 6, 8, 0, 0, 0);

  it("parses explicit datetime with local hour", () => {
    const parsed = parseDueFromText("明日15時に連絡", { now });
    expect(parsed?.kind).toBe("datetime");
    expect(parsed?.timeProvided).toBe(true);

    const expected = new Date(now);
    expected.setDate(expected.getDate() + 1);
    expected.setHours(15, 0, 0, 0);

    expect(parsed?.dueAt).toBe(expected.toISOString());
  });

  it("parses date only with default time", () => {
    const parsed = parseDueFromText("来週金曜まで", { now, defaultDueTime: "10:30" });
    expect(parsed?.kind).toBe("date_only");
    expect(parsed?.timeProvided).toBe(false);

    const due = new Date(parsed!.dueAt);
    expect(due.getHours()).toBe(10);
    expect(due.getMinutes()).toBe(30);
  });
});
