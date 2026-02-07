import { describe, expect, it } from "vitest";
import { taskSavedMessage } from "../src/logic/templates";

describe("response templates", () => {
  it("applies requested tone", () => {
    const polite = taskSavedMessage({ summary: "洗濯", tone: "polite", seed: "tone-pol" });
    const friendly = taskSavedMessage({ summary: "洗濯", tone: "friendly", seed: "tone-pol" });
    const concise = taskSavedMessage({ summary: "洗濯", tone: "concise", seed: "tone-pol" });

    expect(polite).toContain("洗濯");
    expect(friendly).toContain("洗濯");
    expect(concise).toContain("洗濯");
    expect(polite).not.toBe(friendly);
    expect(friendly).not.toBe(concise);
  });

  it("is deterministic for the same seed", () => {
    const first = taskSavedMessage({ summary: "請求書送付", tone: "polite", seed: "fixed-seed" });
    const second = taskSavedMessage({ summary: "請求書送付", tone: "polite", seed: "fixed-seed" });

    expect(first).toBe(second);
  });

  it("rotates variants when seed changes", () => {
    const outputs = new Set<string>();
    for (let i = 0; i < 32; i += 1) {
      outputs.add(taskSavedMessage({ summary: "買い物", tone: "polite", seed: `seed-${i}` }));
    }

    expect(outputs.size).toBeGreaterThan(1);
  });
});
