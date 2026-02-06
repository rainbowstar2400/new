import { describe, expect, it } from "vitest";
import { fallbackSummarySlot, normalizeSummarySlot, validateSummarySlot } from "../src/logic/summary";

describe("summary", () => {
  it("falls back when empty", () => {
    expect(fallbackSummarySlot("")).toBe("内容の記録");
  });

  it("validates slot overlap", () => {
    expect(validateSummarySlot("Aさんへの連絡", "明日Aさんへ連絡")).toBe(true);
    expect(validateSummarySlot("買い物", "明日Aさんへ連絡")).toBe(false);
  });

  it("normalizes with fallback", () => {
    const slot = normalizeSummarySlot("", "最近読んだ本の感想を残しておきたい");
    expect(slot.length).toBeGreaterThan(0);
  });
});
