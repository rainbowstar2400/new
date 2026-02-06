import { describe, expect, it } from "vitest";
import { applyOffset, parseOffsetText } from "../src/logic/offset";

describe("offset", () => {
  it("parses hour-before expression", () => {
    const parsed = parseOffsetText("1時間前にリマインドして");
    expect(parsed?.offsetMinutes).toBe(60);
  });

  it("applies offset", () => {
    const notifyAt = applyOffset("2026-02-07T10:00:00.000Z", 60);
    expect(notifyAt).toBe("2026-02-07T09:00:00.000Z");
  });
});
