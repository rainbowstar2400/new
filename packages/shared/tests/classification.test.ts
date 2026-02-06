import { describe, expect, it } from "vitest";
import { classifyInput, detectMemoCategory } from "../src/logic/classification";

describe("classifyInput", () => {
  it("classifies explicit task", () => {
    const result = classifyInput("明日9時にAさんへ連絡");
    expect(result.kind).toBe("task");
  });

  it("classifies memo want", () => {
    const result = classifyInput("最近読んだ本の感想を残しておきたい");
    expect(result.kind).toBe("memo");
    expect(result.memoCategory).toBe("want");
  });

  it("classifies hiragana desire sentence as want", () => {
    const result = classifyInput("京都にいきたい");
    expect(result.kind).toBe("memo");
    expect(result.memoCategory).toBe("want");
  });

  it("keeps epistemic mitai as non-want", () => {
    const category = detectMemoCategory("この景色は映画みたいです");
    expect(category).toBe("misc");
  });

  it("classifies short task-like noun", () => {
    const result = classifyInput("洗濯");
    expect(result.kind).toBe("task");
  });

  it("classifies bare desire sentence as memo", () => {
    const result = classifyInput("来月は京都に行きたい");
    expect(result.kind).toBe("memo");
    expect(result.memoCategory).toBe("want");
  });

  it("keeps truly short unclear text ambiguous", () => {
    const result = classifyInput("転職準備");
    expect(result.kind).toBe("ambiguous");
  });

  it("detects idea category", () => {
    const category = detectMemoCategory("作業導線の改善アイデア");
    expect(category).toBe("idea");
  });
});
