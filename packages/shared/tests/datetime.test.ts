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

  it("parses full-width hour text", () => {
    const parsed = parseDueFromText("明日１５時に洗濯", { now });
    expect(parsed?.kind).toBe("datetime");
    expect(parsed?.timeProvided).toBe(true);

    const due = new Date(parsed!.dueAt);
    const expected = new Date(now);
    expected.setDate(expected.getDate() + 1);

    expect(due.getDate()).toBe(expected.getDate());
    expect(due.getHours()).toBe(15);
    expect(due.getMinutes()).toBe(0);
  });

  it("parses next-week friday as one week ahead", () => {
    const parsed = parseDueFromText("来週金曜まで", { now, defaultDueTime: "10:30" });
    expect(parsed?.kind).toBe("date_only");
    expect(parsed?.timeProvided).toBe(false);

    const expected = new Date(now);
    expected.setDate(expected.getDate() + 7);
    expected.setHours(10, 30, 0, 0);

    expect(parsed?.dueAt).toBe(expected.toISOString());
  });

  it("parses next monday expression", () => {
    const parsed = parseDueFromText("次の月曜に通知", { now, defaultDueTime: "09:00" });
    expect(parsed?.kind).toBe("date_only");

    const expected = new Date(now);
    expected.setDate(expected.getDate() + 3);
    expected.setHours(9, 0, 0, 0);

    expect(parsed?.dueAt).toBe(expected.toISOString());
  });

  it("parses week-after-next expression", () => {
    const parsed = parseDueFromText("再来週月曜に提出", { now, defaultDueTime: "09:00" });
    expect(parsed?.kind).toBe("date_only");

    const expected = new Date(now);
    expected.setDate(expected.getDate() + 10);
    expected.setHours(9, 0, 0, 0);

    expect(parsed?.dueAt).toBe(expected.toISOString());
  });
});
