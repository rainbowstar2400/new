import { describe, expect, it } from "vitest";
import {
  fallbackSummarySlot,
  normalizeSummarySlot,
  normalizeTaskTitle,
  validateSummarySlot
} from "../src/logic/summary";

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

  it("normalizes task title by removing leading due expression", () => {
    const title = normalizeTaskTitle("明日18時に洗濯", "明日18時に洗濯");
    expect(title).toBe("洗濯");
  });

  it("normalizes task title with full-width datetime prefix", () => {
    const title = normalizeTaskTitle("明日１８時に洗濯", "明日１８時に洗濯");
    expect(title).toBe("洗濯");
  });

  it("normalizes task title with relative-week prefix", () => {
    const title = normalizeTaskTitle("再来週火曜に会議資料を準備", "再来週火曜に会議資料を準備");
    expect(title).toBe("会議資料を準備");
  });

  it("normalizes task title by removing trailing reminder instruction", () => {
    const title = normalizeTaskTitle("請求書送付をリマインドして", "請求書送付をリマインドして");
    expect(title).toBe("請求書送付");
  });
});
