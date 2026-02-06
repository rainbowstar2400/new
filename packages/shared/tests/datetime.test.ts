import { describe, expect, it } from "vitest";
import { parseDueFromText } from "../src/logic/datetime";

describe("parseDueFromText", () => {
  const now = new Date("2026-02-06T00:00:00.000Z");

  it("parses explicit datetime", () => {
    const parsed = parseDueFromText("明日9時に連絡", { now });
    expect(parsed?.kind).toBe("datetime");
    expect(parsed?.timeProvided).toBe(true);
  });

  it("parses date only with default time", () => {
    const parsed = parseDueFromText("来週金曜まで", { now, defaultDueTime: "10:30" });
    expect(parsed?.kind).toBe("date_only");
    expect(parsed?.timeProvided).toBe(false);
    expect(parsed?.dueAt).toContain("T10:30:00.000Z");
  });
});
